from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
)
from pydantic import BaseModel, Field
from openai import OpenAIError

from auth.routes import (
    get_current_user,
    check_request_origin,
)
from client_events import (
    get_authorized_client,
    DEMO_EVENTS,
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
    # Verify request origin.
    check_request_origin(request)

    # Verify the analyst can access this client.
    client = get_authorized_client(client_id, user)

    # Only use existing synthetic demo events for now.
    # Real Splunk evidence is not connected yet.
    events = DEMO_EVENTS.get(client["name"])

    if events is None:
        raise HTTPException(
            status_code=503,
            detail="Client investigation source is not configured",
        )

    # Find the requested event inside the authorized client.
    event = next(
        (e for e in events if e["id"] == payload.event_id),
        None,
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found for this client",
        )

    # Only send selected non-identifying demo fields.
    safe_event = {
        key: event[key]
        for key in (
            "event_type",
            "risk_level",
            "description",
        )
        if key in event
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
        "source": "demo",
        "investigation": investigation,
    }
