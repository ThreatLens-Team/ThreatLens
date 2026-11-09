from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth.database import initialize_database
from auth.routes import router as auth_router
from clients import router as clients_router
from client_events import router as client_events_router
from client_investigations import router as client_investigations_router
from client_cases import router as client_cases_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# Authentication endpoints.
app.include_router(auth_router)

# Client management endpoints.
app.include_router(clients_router)

# Authorized client-specific security events.
app.include_router(client_events_router)
app.include_router(client_investigations_router)

app.include_router(client_cases_router)

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "ThreatLens API",
    }
