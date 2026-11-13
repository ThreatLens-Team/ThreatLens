import json
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from auth.database import get_connection
from auth.routes import get_current_user, check_request_origin
from client_events import get_authorized_client, get_client_events


router = APIRouter(
    prefix="/api/clients",
    tags=["Client Investigation Cases"],
)


class OpenCaseRequest(BaseModel):
    event_id: str = Field(min_length=1, max_length=64)


def format_case(row, current_user_id):
    case = dict(row)

    case["event"] = json.loads(
        case.pop("event_snapshot")
    )

    case["owner_id"] = case.pop("user_id")

    # Display only the email prefix.
    # The full email is not returned to React.
    owner_email = case.pop("owner_email")
    case["owner"] = owner_email.split("@", 1)[0]

    # The assigned analyst owns the case.
    case["is_owner"] = (
        case["owner_id"] == current_user_id
    )

    # Only the owner can modify an investigation,
    # and only while it is being investigated.
    case["can_edit"] = (
        case["is_owner"]
        and case["status"] == "investigating"
    )

    return case

# Show all investigations belonging to an authorized client workspace.
@router.get("/{client_id}/cases")
def list_client_cases(
    client_id: int,
    response: Response,
    user=Depends(get_current_user),
):
    get_authorized_client(client_id, user)

    with get_connection() as db:
        rows = db.execute(
            """
            SELECT
                c.id,
                c.user_id,
                c.client_id,
                c.event_id,
                c.event_snapshot,
                c.status,
		c.ai_result,
		c.ai_state,
		c.ai_updated_at,
                c.created_at,
                c.updated_at,
                u.email AS owner_email
            FROM investigation_cases c
            JOIN users u ON u.id = c.user_id
            WHERE c.client_id = ?
            ORDER BY c.created_at DESC, c.id DESC
            """,
            (client_id,),
        ).fetchall()

    cases = [
        format_case(row, user["id"])
        for row in rows
    ]

    active_count = sum(
        case["status"] in ("investigating", "review")
        for case in cases
    )

    response.headers["Cache-Control"] = "no-store"

    return {
        "status": "ok",
        "client_id": client_id,
        "count": len(cases),
        "active_count": active_count,
        "cases": cases,
    }


# Create one shared investigation per client event.
@router.post("/{client_id}/cases")
def open_client_case(
    client_id: int,
    payload: OpenCaseRequest,
    request: Request,
    response: Response,
    user=Depends(get_current_user),
):
    check_request_origin(request)

    get_authorized_client(client_id, user)

    # Obtain the event from the authorized backend source.
    # The browser supplies only the event ID.
    data = get_client_events(
        client_id=client_id,
        user=user,
    )

    event = next(
        (
            item for item in data["events"]
            if item["id"] == payload.event_id
        ),
        None,
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found for this client",
        )

    allowed_fields = (
        "id",
        "event_type",
        "username",
        "source_ip",
        "timestamp",
        "risk_level",
        "status",
        "description",
    )

    snapshot = {
        key: event[key]
        for key in allowed_fields
        if key in event
    }

    with get_connection() as db:
        cursor = db.execute(
            """
            INSERT INTO investigation_cases
                (
                    user_id,
                    client_id,
                    event_id,
                    event_snapshot,
                    status
                )
            VALUES (?, ?, ?, ?, 'investigating')
            ON CONFLICT(client_id, event_id)
            DO NOTHING
            """,
            (
                user["id"],
                client_id,
                payload.event_id,
                json.dumps(snapshot),
            ),
        )

        created = cursor.rowcount == 1

        # Return the same shared case regardless of who opened it.
        row = db.execute(
            """
            SELECT
                c.id,
                c.user_id,
                c.client_id,
                c.event_id,
                c.event_snapshot,
                c.status,
		c.ai_result,
		c.ai_state,
		c.ai_updated_at,
                c.created_at,
                c.updated_at,
                u.email AS owner_email
            FROM investigation_cases c
            JOIN users u ON u.id = c.user_id
            WHERE c.client_id = ?
              AND c.event_id = ?
            """,
            (client_id, payload.event_id),
        ).fetchone()

    response.headers["Cache-Control"] = "no-store"

    return {
        "status": "ok",
        "created": created,
        "case": format_case(row, user["id"]),
    }
