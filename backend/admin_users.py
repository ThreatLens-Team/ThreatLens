from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from pydantic import BaseModel

from auth.database import get_connection
from auth.routes import (
    get_current_user,
    check_request_origin,
)


router = APIRouter(
    prefix="/api/admin/users",
    tags=["Admin User Management"],
)


class UserStatusUpdate(BaseModel):
    is_active: bool


def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )

    return user


# List all registered ThreatLens users.
@router.get("")
def list_users(admin=Depends(require_admin)):
    with get_connection() as connection:
        rows = connection.execute("""
            SELECT
                id,
                email,
                role,
                is_active,
                created_at
            FROM users
            ORDER BY created_at DESC, id DESC
        """).fetchall()

    return {
        "users": [dict(row) for row in rows]
    }


# Activate or deactivate an existing user.
@router.patch("/{user_id}/status")
def update_user_status(
    user_id: int,
    update: UserStatusUpdate,
    request: Request,
    admin=Depends(require_admin),
):
    # Protect state-changing requests from
    # cross-origin submissions.
    check_request_origin(request)

    new_status = int(update.is_active)

    with get_connection() as connection:
        # Serialize account-status changes so concurrent
        # requests cannot bypass admin safeguards.
        connection.execute("BEGIN IMMEDIATE")

        user = connection.execute("""
            SELECT id, email, role, is_active
            FROM users
            WHERE id = ?
        """, (user_id,)).fetchone()

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found",
            )

        # Do not allow administrators to
        # deactivate their own accounts.
        if user_id == admin["id"] and new_status == 0:
            raise HTTPException(
                status_code=403,
                detail="You cannot deactivate your own account",
            )

        # Keep at least one active administrator.
        if user["role"] == "admin" and new_status == 0:
            active_admins = connection.execute("""
                SELECT COUNT(*) AS total
                FROM users
                WHERE role = 'admin'
                  AND is_active = 1
            """).fetchone()["total"]

            if active_admins <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot deactivate the last active administrator",
                )

        connection.execute("""
            UPDATE users
            SET is_active = ?
            WHERE id = ?
        """, (new_status, user_id))

        # Invalidate all existing login sessions when
        # an account is deactivated.
        if new_status == 0:
            connection.execute("""
                DELETE FROM sessions
                WHERE user_id = ?
            """, (user_id,))

        connection.commit()

    return {
        "message": (
            "User activated successfully"
            if new_status == 1
            else "User deactivated successfully"
        ),
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "is_active": new_status,
        },
    }
