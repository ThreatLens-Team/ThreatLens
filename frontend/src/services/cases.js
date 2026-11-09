
const API_URL = import.meta.env.VITE_API_URL;

// Shared helper for investigation case requests.
async function caseRequest(path, options = {}) {
  const { method = "GET", body, signal } = options;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: body
      ? { "Content-Type": "application/json" }
      : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Unable to complete investigation request."
    );
  }

  return data;
}

// Retrieve shared investigations for the selected client.
export function getClientCases(clientId, signal) {
  return caseRequest(
    `/api/clients/${encodeURIComponent(clientId)}/cases`,
    { signal }
  );
}

// Create a case or retrieve an existing shared case.
// Only the event ID is sent; the backend validates the event.
export function openClientCase(clientId, eventId, signal) {
  return caseRequest(
    `/api/clients/${encodeURIComponent(clientId)}/cases`,
    {
      method: "POST",
      body: { event_id: eventId },
      signal,
    }
  );
}
