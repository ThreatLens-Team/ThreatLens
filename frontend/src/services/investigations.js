
const API_URL = import.meta.env.VITE_API_URL;

export async function investigateClientEvent(
  clientId,
  eventId,
  signal
) {
  const response = await fetch(
    `${API_URL}/api/clients/${encodeURIComponent(clientId)}/investigations`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_id: eventId,
      }),
      signal,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Unable to complete AI investigation."
    );

    error.status = response.status;
    throw error;
  }

  return data;
}
