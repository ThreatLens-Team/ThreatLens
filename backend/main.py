from pydantic import BaseModel, Field
from openai import OpenAIError
from ai_agent import investigate_event
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from splunk_client import search_threatlens


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "ThreatLens API"
    }


@app.get("/api/splunk/events")
def get_splunk_events():
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

class InvestigationRequest(BaseModel):
    event: dict = Field(
        ...,
        description="Synthetic sanitized IAM event"
    )


@app.post("/api/ai/investigate")
async def ai_investigate(request: InvestigationRequest):
    try:
        investigation = await investigate_event(
            request.event
        )

        return {
            "status": "ok",
            "investigation": investigation
        }

    except (OpenAIError, RuntimeError):
        raise HTTPException(
            status_code=502,
            detail="Unable to complete AI investigation"
        )
