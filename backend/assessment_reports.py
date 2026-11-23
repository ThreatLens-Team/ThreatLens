
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
)
from pydantic import BaseModel, Field

from auth.database import get_connection
from auth.routes import get_current_user, check_request_origin
from client_events import get_authorized_client


router = APIRouter(
    prefix="/api/clients",
    tags=["Assessment Reports"],
)


class ReportDraftUpdate(BaseModel):
    draft_assessment: str = Field(max_length=20000)
    draft_findings: str = Field(max_length=20000)
    draft_recommendations: str = Field(max_length=20000)
    analyst_notes: str = Field(max_length=20000)


def get_owned_case(db, client_id, case_id, user):
    # Verify client authorization on the server.
    get_authorized_client(client_id, user)

    case = db.execute(
        """
        SELECT *
        FROM investigation_cases
        WHERE id = ?
          AND client_id = ?
        """,
        (case_id, client_id),
    ).fetchone()

    if case is None:
        raise HTTPException(
            status_code=404,
            detail="Investigation case not found",
        )

    if (
        user["role"] != "analyst"
        or case["user_id"] != user["id"]
    ):
        raise HTTPException(
            status_code=403,
            detail="Only the assigned analyst may manage this report",
        )

    return case


def format_report(row):
    if row is None:
        return None
    return dict(row)


# Retrieve an existing draft and the latest review feedback.
@router.get("/{client_id}/cases/{case_id}/report")
def get_assessment_report(
    client_id: int,
    case_id: int,
    response: Response,
    user=Depends(get_current_user),
):
    with get_connection() as db:
        case = get_owned_case(db, client_id, case_id, user)

        report = db.execute(
            """
            SELECT *
            FROM assessment_reports
            WHERE case_id = ?
            """,
            (case_id,),
        ).fetchone()

        latest_review = None

        if report is not None:
            latest_review = db.execute(
                """
                SELECT
                    revision_number,
                    decision,
                    feedback,
                    reviewed_at,
                    reviewer_id,
                    submitted_at
                FROM assessment_report_versions
                WHERE report_id = ?
                ORDER BY revision_number DESC
                LIMIT 1
                """,
                (report["id"],),
            ).fetchone()

    response.headers["Cache-Control"] = "no-store"

    return {
        "status": "ok",
        "case_id": case_id,
        "case_status": case["status"],
        "report": format_report(report),
        "latest_review": format_report(latest_review),
    }


# Save the analyst-edited assessment without changing AI output.
@router.patch("/{client_id}/cases/{case_id}/report")
def save_assessment_report(
    client_id: int,
    case_id: int,
    payload: ReportDraftUpdate,
    request: Request,
    response: Response,
    user=Depends(get_current_user),
):
    check_request_origin(request)

    with get_connection() as db:
        db.execute("BEGIN IMMEDIATE")

        case = get_owned_case(db, client_id, case_id, user)

        if case["status"] != "investigating":
            raise HTTPException(
                status_code=409,
                detail="This investigation is not editable",
            )

        existing = db.execute(
            """
            SELECT *
            FROM assessment_reports
            WHERE case_id = ?
            """,
            (case_id,),
        ).fetchone()

        if existing is not None and existing["status"] not in (
            "draft",
            "needs_revision",
        ):
            raise HTTPException(
                status_code=409,
                detail="This report is not editable",
            )

        if existing is None:
            db.execute(
                """
                INSERT INTO assessment_reports (
                    case_id,
                    draft_assessment,
                    draft_findings,
                    draft_recommendations,
                    analyst_notes
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    case_id,
                    payload.draft_assessment,
                    payload.draft_findings,
                    payload.draft_recommendations,
                    payload.analyst_notes,
                ),
            )
        else:
            db.execute(
                """
                UPDATE assessment_reports
                SET
                    draft_assessment = ?,
                    draft_findings = ?,
                    draft_recommendations = ?,
                    analyst_notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    payload.draft_assessment,
                    payload.draft_findings,
                    payload.draft_recommendations,
                    payload.analyst_notes,
                    existing["id"],
                ),
            )

        report = db.execute(
            """
            SELECT *
            FROM assessment_reports
            WHERE case_id = ?
            """,
            (case_id,),
        ).fetchone()

        db.commit()

    response.headers["Cache-Control"] = "no-store"

    return {
        "status": "ok",
        "message": "Assessment draft saved",
        "report": format_report(report),
    }


# Submit a new, immutable report revision for administrator review.
@router.post("/{client_id}/cases/{case_id}/report/submit")
def submit_assessment_report(
    client_id: int,
    case_id: int,
    request: Request,
    response: Response,
    user=Depends(get_current_user),
):
    check_request_origin(request)

    with get_connection() as db:
        db.execute("BEGIN IMMEDIATE")

        case = get_owned_case(db, client_id, case_id, user)

        if case["status"] != "investigating":
            raise HTTPException(
                status_code=409,
                detail="This investigation cannot be submitted",
            )

        report = db.execute(
            """
            SELECT *
            FROM assessment_reports
            WHERE case_id = ?
            """,
            (case_id,),
        ).fetchone()

        if report is None:
            raise HTTPException(
                status_code=400,
                detail="Save an assessment draft before submitting",
            )

        if report["status"] not in ("draft", "needs_revision"):
            raise HTTPException(
                status_code=409,
                detail="This report cannot be submitted",
            )

        if not report["draft_assessment"].strip():
            raise HTTPException(
                status_code=400,
                detail="The assessment must not be empty",
            )

        revision_number = report["revision_number"] + 1

        db.execute(
            """
            INSERT INTO assessment_report_versions (
                report_id,
                revision_number,
                submitted_assessment,
                submitted_findings,
                submitted_recommendations,
                submitted_notes,
                ai_result_snapshot,
                submitted_by,
                decision
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            """,
            (
                report["id"],
                revision_number,
                report["draft_assessment"],
                report["draft_findings"],
                report["draft_recommendations"],
                report["analyst_notes"],
                case["ai_result"],
                user["id"],
            ),
        )

        db.execute(
            """
            UPDATE assessment_reports
            SET status = 'submitted',
                revision_number = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (revision_number, report["id"]),
        )

        db.execute(
            """
            UPDATE investigation_cases
            SET status = 'review',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (case_id,),
        )

        db.commit()

    response.headers["Cache-Control"] = "no-store"

    return {
        "status": "ok",
        "message": "Assessment submitted for administrator review",
        "report_id": report["id"],
        "case_id": case_id,
        "revision_number": revision_number,
        "report_status": "submitted",
        "case_status": "review",
    }

