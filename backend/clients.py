import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from auth.database import get_connection
from auth.routes import get_current_user


router = APIRouter(prefix="/api/clients", tags=["Clients"])


class ClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class AnalystAssignment(BaseModel):
    user_id: int = Field(gt=0)
    client_id: int = Field(gt=0)


def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )

    return user


# List the clients the current user may access.
@router.get("")
def list_clients(user=Depends(get_current_user)):
    with get_connection() as connection:
        if user["role"] == "admin":
            rows = connection.execute("""
                SELECT id, name, is_active
                FROM clients
                WHERE is_active = 1
                ORDER BY name
            """).fetchall()
        else:
            rows = connection.execute("""
                SELECT c.id, c.name, c.is_active
                FROM clients AS c
                JOIN analyst_client_assignments AS a
                    ON a.client_id = c.id
                WHERE a.user_id = ?
                  AND c.is_active = 1
                ORDER BY c.name
            """, (user["id"],)).fetchall()

    return {"clients": [dict(row) for row in rows]}


# Only administrators can register clients.
@router.post("", status_code=201)
def create_client(
    client: ClientCreate,
    admin=Depends(require_admin),
):
    name = client.name.strip()

    if not name:
        raise HTTPException(
            status_code=422,
            detail="Client name cannot be empty",
        )

    try:
        with get_connection() as connection:
            cursor = connection.execute("""
                INSERT INTO clients (name)
                VALUES (?)
            """, (name,))
            client_id = cursor.lastrowid
            connection.commit()

    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="Client already exists",
        )

    return {
        "id": client_id,
        "name": name,
        "is_active": 1,
    }


# Administrators can view all analyst assignments.
@router.get("/assignments")
def list_assignments(admin=Depends(require_admin)):
    with get_connection() as connection:
        rows = connection.execute("""
            SELECT
                a.user_id,
                u.email AS analyst_email,
                a.client_id,
                c.name AS client_name,
                a.assigned_at
            FROM analyst_client_assignments AS a
            JOIN users AS u ON u.id = a.user_id
            JOIN clients AS c ON c.id = a.client_id
            ORDER BY u.email, c.name
        """).fetchall()

    return {"assignments": [dict(row) for row in rows]}


# Administrators can assign analysts to clients.
@router.post("/assignments", status_code=201)
def assign_analyst(
    assignment: AnalystAssignment,
    admin=Depends(require_admin),
):
    with get_connection() as connection:
        analyst = connection.execute("""
            SELECT id, role, is_active
            FROM users
            WHERE id = ?
        """, (assignment.user_id,)).fetchone()

        if (
            analyst is None
            or analyst["role"] != "analyst"
            or analyst["is_active"] != 1
        ):
            raise HTTPException(
                status_code=400,
                detail="Valid active analyst required",
            )

        client = connection.execute("""
            SELECT id, is_active
            FROM clients
            WHERE id = ?
        """, (assignment.client_id,)).fetchone()

        if client is None or client["is_active"] != 1:
            raise HTTPException(
                status_code=400,
                detail="Valid active client required",
            )

        try:
            connection.execute("""
                INSERT INTO analyst_client_assignments
                    (user_id, client_id)
                VALUES (?, ?)
            """, (
                assignment.user_id,
                assignment.client_id,
            ))
            connection.commit()

        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="Analyst is already assigned to this client",
            )

    return {
        "message": "Analyst assigned successfully",
        "user_id": assignment.user_id,
        "client_id": assignment.client_id,
    }
