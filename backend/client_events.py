
from fastapi import APIRouter, Depends, HTTPException

from auth.database import get_connection
from auth.routes import get_current_user


router = APIRouter(
    prefix="/api/clients",
    tags=["Client Security Events"],
)


# Demonstration security events.
# These are not real Splunk events.
DEMO_EVENTS = {
    "Demo Company B": [
        {
            "id": "B-001",
            "event_type": "LOGIN_FAILURE",
            "username": "demo.b.user",
            "risk_level": "medium",
            "description": "Multiple failed login attempts",
        },
        {
            "id": "B-002",
            "event_type": "LOGIN_SUCCESS",
            "username": "demo.b.admin",
            "risk_level": "low",
            "description": "Successful administrator login",
        },
    ],
    "Demo Company C": [
        {
            "id": "C-001",
            "event_type": "UNAUTHORIZED_ACCESS",
            "username": "demo.c.user",
            "risk_level": "high",
            "description": "Attempted access to restricted resource",
        },
        {
            "id": "C-002",
            "event_type": "LOGIN_FAILURE",
            "username": "demo.c.user",
            "risk_level": "medium",
            "description": "Failed login attempt",
        },
    ],
}


def get_authorized_client(client_id, user):
    with get_connection() as connection:
        client = connection.execute(
            """
            SELECT id, name, is_active
            FROM clients
            WHERE id = ?
            """,
            (client_id,),
        ).fetchone()

        if client is None:
            raise HTTPException(
                status_code=404,
                detail="Client not found",
            )

        if client["is_active"] != 1:
            raise HTTPException(
                status_code=403,
                detail="Client is inactive",
            )

        if user["role"] != "admin":
            assignment = connection.execute(
                """
                SELECT 1
                FROM analyst_client_assignments
                WHERE user_id = ?
                  AND client_id = ?
                """,
                (user["id"], client_id),
            ).fetchone()

            if assignment is None:
                raise HTTPException(
                    status_code=403,
                    detail="Access to this client is not permitted",
                )

        return dict(client)


@router.get("/{client_id}/events")
def get_client_events(
    client_id: int,
    user=Depends(get_current_user),
):
    # Verify permissions before retrieving events.
    client = get_authorized_client(client_id, user)

    client_name = client["name"]

    # Vet Clinic's real Splunk integration will be
    # connected after client-specific filtering is ready.
    if client_name == "Vet Clinic":
        raise HTTPException(
            status_code=503,
            detail=(
                "Vet Clinic Splunk events are unavailable "
                "until client-specific filtering is configured"
            ),
        )

    if client_name not in DEMO_EVENTS:
        raise HTTPException(
            status_code=503,
            detail="Client event source is not configured",
        )

    events = DEMO_EVENTS[client_name]

    return {
        "status": "ok",
        "client_id": client["id"],
        "client_name": client_name,
        "source": "demo",
        "count": len(events),
        "events": events,
    }
