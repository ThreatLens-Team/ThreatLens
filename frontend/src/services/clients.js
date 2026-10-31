
const API_URL = import.meta.env.VITE_API_URL;

async function clientRequest(path, signal) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    credentials: "include",
    signal,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Unable to retrieve client information."
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

export function getClients(signal) {
  return clientRequest("/api/clients", signal);
}

export function getClientEvents(clientId, signal) {
  return clientRequest(
    `/api/clients/${encodeURIComponent(clientId)}/events`,
    signal
  );
}
