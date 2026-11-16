from fastapi import APIRouter, Depends, HTTPException, status

from auth.database import get_connection
from auth.routes import get_current_user


router = APIRouter(
    prefix="/api/admin/users",
    tags=["Admin User Management"],
)


def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )

    return user


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
