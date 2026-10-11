import json
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv


ENV_FILE = Path(__file__).with_name(".env")
load_dotenv(ENV_FILE)

SPLUNK_URL = os.getenv("SPLUNK_URL")
SPLUNK_USERNAME = os.getenv("SPLUNK_USERNAME")
SPLUNK_PASSWORD = os.getenv("SPLUNK_PASSWORD")


def _validate_config():
    missing = []

    if not SPLUNK_URL:
        missing.append("SPLUNK_URL")
    if not SPLUNK_USERNAME:
        missing.append("SPLUNK_USERNAME")
    if not SPLUNK_PASSWORD:
        missing.append("SPLUNK_PASSWORD")

    if missing:
        raise RuntimeError(
            f"Missing required Splunk configuration: {', '.join(missing)}"
        )


def search_threatlens(search_query: str):
    _validate_config()

    endpoint = f"{SPLUNK_URL}/services/search/v2/jobs/export"

    response = httpx.post(
        endpoint,
        auth=(SPLUNK_USERNAME, SPLUNK_PASSWORD),
        data={
            "search": f"search index=threatlens {search_query}",
            "output_mode": "json",
        },
        verify=False,
        timeout=30.0,
    )

    response.raise_for_status()

    results = []

    for line in response.text.splitlines():
        if not line.strip():
            continue

        payload = json.loads(line)

        if "result" in payload:
            results.append(payload["result"])

    return results
