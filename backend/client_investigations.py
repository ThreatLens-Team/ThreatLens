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
from auth.routes import (
    get_current_user,
    check_request_origin,
)
from client_events import (
    get_authorized_client,
    get_client_events,
)
from ai_agent import investigate_event


router = APIRouter(
    prefix="/api/clients",
    tags=["Client AI Investigations"],
)


class InvestigationRequest(BaseModel):
    event_id: str = Field(
        min_length=1,
        max_length=64,
    )


@router.post("/{client_id}/investigations")
async def investigate_client_event(
    client_id: int,
    payload: InvestigationRequest,
    request: Request,
    response: Response,
    user=Depends(get_current_user),
):
    # Protect the authenticated POST request.
    check_request_origin(request)

    # Verify access to the selected client workspace.
    client = get_authorized_client(client_id, user)

    # Find the existing investigation case.
    # Cases are shared within a client but assigned
    # to one analyst.
    with get_connection() as db:
        case = db.execute(
            """
            SELECT id, user_id, status
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

    # Only the assigned case owner can generate
    # or change the AI analysis.
    if case["user_id"] != user["id"]:
        raise HTTPException(
            status_code=403,
            detail="Only the assigned analyst can generate AI analysis",
        )

    # Cases awaiting approval or already verified
    # should not be changed through this action.
    if case["status"] != "investigating":
        raise HTTPException(
            status_code=409,
            detail="This investigation is not in an editable state",
        )

    # Retrieve events from the authorized client source:
    # Vet Clinic -> Splunk
    # Demo companies -> demonstration data
    data = get_client_events(
        client_id=client_id,
        user=user,
    )

    # Never accept event details from the browser.
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
            detail="Event not found in the current client event results",
        )

    # Send only relevant, limited security evidence.
    # Do not send account emails, usernames,
    # passwords, or complete raw Splunk records.
    safe_event = {
        "data_source": data["source"],
        "event_type": event.get("event_type"),
        "event_result": event.get("status", "UNKNOWN"),
        "event_timestamp": event.get("timestamp"),
        "description": event.get("description"),
        "risk_level": event.get("risk_level", "unknown"),
    }

    try:
        investigation = await investigate_event(safe_event)

    except (OpenAIError, RuntimeError):
        raise HTTPException(
            status_code=502,
            detail="AI investigation unavailable",
        )

    response.headers["Cache-Control"] = "no-store"

    return {
        "status": "ok",
        "client_id": client["id"],
        "event_id": event["id"],
        "case_id": case["id"],
        "source": data["source"],
        "investigation": investigation,
    }
