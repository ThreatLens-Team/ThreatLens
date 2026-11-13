import json
import logging
import secrets
import time

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
)
from pydantic import BaseModel, Field
from openai import OpenAIError

from auth.database import get_connection
from auth.routes import get_current_user, check_request_origin
from client_events import get_authorized_client, get_client_events
from ai_agent import investigate_event


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/clients",
    tags=["Client AI Investigations"],
)

# A crashed or interrupted request can be retried
# after this period. Older request tokens cannot
# overwrite newer saved results.
GENERATION_TIMEOUT_SECONDS = 600


class InvestigationRequest(BaseModel):
    event_id: str = Field(min_length=1, max_length=64)
    regenerate: bool = False


def release_generation_claim(case_id, token):
    """Clear a failed request without deleting saved AI results."""
    with get_connection() as db:
        db.execute(
            """
            UPDATE investigation_cases
            SET
                ai_state = CASE
                    WHEN ai_result IS NULL THEN 'failed'
                    ELSE 'complete'
                END,
                ai_generation_token = NULL,
                ai_started_at = NULL
            WHERE id = ?
              AND ai_generation_token = ?
            """,
            (case_id, token),
        )


@router.post("/{client_id}/investigations")
async def investigate_client_event(
    client_id: int,
    payload: InvestigationRequest,
    request: Request,
    response: Response,
    user=Depends(get_current_user),
):
    check_request_origin(request)

    # Confirm that the user can access this company.
    client = get_authorized_client(client_id, user)

    token = secrets.token_hex(16)
    now = int(time.time())

    # BEGIN IMMEDIATE serializes claims for the same
    # SQLite database. Do not hold a database transaction
    # open while waiting for OpenAI.
    with get_connection() as db:
        db.execute("BEGIN IMMEDIATE")

        case = db.execute(
            """
            SELECT
                id,
                user_id,
                client_id,
                event_id,
                event_snapshot,
                status,
                ai_result,
                ai_state,
                ai_started_at
            FROM investigation_cases
            WHERE client_id = ?
              AND event_id = ?
            """,
            (client_id, payload.event_id),
        ).fetchone()

        if case is None:
            raise HTTPException(
                status_code=404,
                detail="Open an investigation case first",
            )

        # Only the assigned analyst can generate AI analysis.
        if case["user_id"] != user["id"]:
            raise HTTPException(
                status_code=403,
                detail="Only the assigned analyst can generate AI analysis",
            )

        if case["status"] != "investigating":
            raise HTTPException(
                status_code=409,
                detail="This investigation is not in an editable state",
            )

        case_id = case["id"]
        event_snapshot = case["event_snapshot"]

        # Return saved results for ordinary requests.
        # This avoids unnecessary OpenAI calls.
        if case["ai_result"] and not payload.regenerate:
            response.headers["Cache-Control"] = "no-store"

            return {
                "status": "ok",
                "client_id": client["id"],
                "event_id": payload.event_id,
                "case_id": case_id,
                "source": "saved_case_analysis",
                "investigation": case["ai_result"],
                "cached": True,
            }

        # Reject overlapping generation requests.
        if case["ai_state"] == "generating":
            started = case["ai_started_at"]

            if (
                started is not None
                and now - int(started) < GENERATION_TIMEOUT_SECONDS
            ):
                raise HTTPException(
                    status_code=409,
                    detail="AI analysis is already being generated",
                )

        # Claim this case for one AI generation request.
        db.execute(
            """
            UPDATE investigation_cases
            SET
                ai_state = 'generating',
                ai_generation_token = ?,
                ai_started_at = ?
            WHERE id = ?
              AND status = 'investigating'
            """,
            (token, now, case_id),
        )

    try:
        # Use the trusted event snapshot saved when
        # the analyst originally opened this case.
        event = json.loads(event_snapshot)

        if not isinstance(event, dict):
            raise RuntimeError("Invalid saved event snapshot")

        source = "saved_case_snapshot"

        # Prefer current authorized client event data
        # when it is still available.
        try:
            data = get_client_events(
                client_id=client_id,
                user=user,
            )

            current_event = next(
                (
                    item for item in data["events"]
                    if item["id"] == payload.event_id
                ),
                None,
            )

            if current_event is not None:
                event = current_event
                source = data["source"]

        except HTTPException as error:
            if error.status_code in (401, 403):
                raise

            logger.warning(
                "Current event retrieval unavailable; using case snapshot",
                exc_info=True,
            )

        except Exception:
            logger.warning(
                "Current event retrieval unavailable; using case snapshot",
                exc_info=True,
            )

        # Keep the existing limited evidence policy.
        # No full raw Splunk record, passwords, or
        # direct account identifier is sent to OpenAI.
        safe_event = {
            "data_source": source,
            "event_type": event.get("event_type"),
            "event_result": event.get("status", "UNKNOWN"),
            "event_timestamp": event.get("timestamp"),
            "description": event.get("description"),
            "risk_level": event.get("risk_level", "unknown"),
        }

        investigation = await investigate_event(safe_event)

        if (
            not isinstance(investigation, str)
            or not investigation.strip()
        ):
            raise RuntimeError("AI returned an empty investigation")

        # Save only if this request still owns the claim.
        # Preserve the previous result until the new one
        # has been generated successfully.
        with get_connection() as db:
            updated = db.execute(
                """
                UPDATE investigation_cases
                SET
                    ai_result = ?,
                    ai_state = 'complete',
                    ai_generation_token = NULL,
                    ai_started_at = NULL,
                    ai_updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND ai_generation_token = ?
                  AND status = 'investigating'
                """,
                (investigation, case_id, token),
            ).rowcount

        if updated != 1:
            raise HTTPException(
                status_code=409,
                detail="Investigation changed while AI analysis was running",
            )

    except HTTPException:
        release_generation_claim(case_id, token)
        raise

    except (OpenAIError, RuntimeError) as error:
        release_generation_claim(case_id, token)

        raise HTTPException(
            status_code=502,
            detail="AI investigation unavailable",
        ) from error

    except Exception:
        release_generation_claim(case_id, token)
        logger.exception(
            "Unexpected AI investigation failure for case %s",
            case_id,
        )

        raise HTTPException(
            status_code=502,
            detail="AI investigation unavailable",
        ) from None

    response.headers["Cache-Control"] = "no-store"

    return {
        "status": "ok",
        "client_id": client["id"],
        "event_id": payload.event_id,
        "case_id": case_id,
        "source": source,
        "investigation": investigation,
        "cached": False,
    }
