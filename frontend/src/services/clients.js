
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

export function getClientAssignments(signal) {
    return clientRequest("/api/clients/assignments", signal);
  }
  
  export async function createClient(name) {
    const response = await fetch(`${API_URL}/api/clients`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
  
    const data = await response.json();
  
    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Unable to create client."
      );
    }
  
    return data;
  }


  export function getActiveAnalysts(signal) {
    return clientRequest("/api/clients/analysts", signal);
  }
  
  export async function assignAnalystToClient(userId, clientId) {
    const response = await fetch(
      `${API_URL}/api/clients/assignments`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: Number(userId),
          client_id: Number(clientId),
        }),
      }
    );
  
    const data = await response.json();
  
    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Unable to assign analyst."
      );
    }
  
    return data;
  }
  