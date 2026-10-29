
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

from auth.database import initialize_database
from auth.routes import router as auth_router
from auth.routes import get_current_user

from splunk_client import search_threatlens


# Initialize the authentication database when FastAPI starts.
@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(lifespan=lifespan)


# Allow the React frontend to communicate with FastAPI.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# Register authentication endpoints.
app.include_router(auth_router)


# Public health check endpoint.
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "ThreatLens API"
    }


# Protected Splunk events endpoint.
@app.get("/api/splunk/events")
def get_splunk_events(
    user=Depends(get_current_user),
):
    try:
        events = search_threatlens("| head 100")

        return {
            "status": "ok",
            "count": len(events),
            "events": events
        }

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve events from Splunk"
        )
