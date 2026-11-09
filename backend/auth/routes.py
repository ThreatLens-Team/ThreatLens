import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from pydantic import BaseModel, EmailStr

from auth.database import get_connection
from auth.security import verify_password


router = APIRouter(prefix="/api/auth", tags=["Authentication"])

COOKIE_NAME = "threatlens_session"
SESSION_HOURS = 8

# Local development uses HTTP.
# Production must use HTTPS and secure cookies.
IS_LOCAL = os.getenv("THREATLENS_ENV", "local") == "local"

ALLOWED_ORIGINS = {
    "http://localhost:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def utc_now():
    return datetime.now(timezone.utc)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()



from urllib.parse import urlsplit

def check_request_origin(request: Request):
    origin = request.headers.get("origin")

    if origin in ALLOWED_ORIGINS:
        return

    if origin is None:
        referer = request.headers.get("referer")

        if referer:
            parsed = urlsplit(referer)
            referer_origin = (
                f"{parsed.scheme}://{parsed.netloc}"
            )

            if (
                referer_origin in ALLOWED_ORIGINS
                and parsed.path.startswith("/docs")
            ):
                return

    raise HTTPException(
        status_code=403,
        detail="Request origin not allowed",
    )




def get_current_user(request: Request):
    token = request.cookies.get(COOKIE_NAME)

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
        )

    with get_connection() as connection:
        session = connection.execute(
            """
            SELECT
                users.id,
                users.email,
                users.role,
                users.is_active,
                sessions.expires_at
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ?
            """,
            (token_hash(token),),
        ).fetchone()

    if session is None or not session["is_active"]:
        raise HTTPException(
            status_code=401,
            detail="Invalid session",
        )

    expiration = datetime.fromisoformat(
        session["expires_at"]
    )

    if utc_now() >= expiration:
        raise HTTPException(
            status_code=401,
            detail="Session expired",
        )

    return {
        "id": session["id"],
        "email": session["email"],
        "role": session["role"],
    }


@router.post("/login")
def login(
    credentials: LoginRequest,
    request: Request,
    response: Response,
):
    check_request_origin(request)

    email = credentials.email.lower()

    with get_connection() as connection:
        user = connection.execute(
            """
            SELECT id, email, password_hash, role, is_active
            FROM users
            WHERE email = ?
            """,
            (email,),
        ).fetchone()

    if (
        user is None
        or not user["is_active"]
        or not verify_password(
            credentials.password,
            user["password_hash"],
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    token = secrets.token_urlsafe(32)
    expiration = utc_now() + timedelta(hours=SESSION_HOURS)

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO sessions
                (token_hash, user_id, expires_at)
            VALUES (?, ?, ?)
            """,
            (
                token_hash(token),
                user["id"],
                expiration.isoformat(),
            ),
        )
        connection.commit()

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=not IS_LOCAL,
        samesite="strict",
        max_age=SESSION_HOURS * 3600,
        path="/",
    )

    response.headers["Cache-Control"] = "no-store"

    return {
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
        },
    }


@router.get("/me")
def current_user(
    response: Response,
    user=Depends(get_current_user),
):
    response.headers["Cache-Control"] = "no-store"
    return user


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
):
    check_request_origin(request)

    token = request.cookies.get(COOKIE_NAME)

    if token:
        with get_connection() as connection:
            connection.execute(
                "DELETE FROM sessions WHERE token_hash = ?",
                (token_hash(token),),
            )
            connection.commit()

    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=not IS_LOCAL,
        samesite="strict",
    )

    return {"message": "Logged out successfully"}
