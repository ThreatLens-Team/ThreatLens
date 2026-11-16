const API_URL = import.meta.env.VITE_API_URL;


export async function updateUserStatus(userId, isActive) {
    const response = await fetch(
      `${API_URL}/api/admin/users/${encodeURIComponent(userId)}/status`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: isActive,
        }),
      }
    );
  
    const data = await response.json();
  
    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Unable to update user status."
      );
    }
  
    return data;
  }
  

    
export async function getAdminUsers(signal) {
  const response = await fetch(
    `${API_URL}/api/admin/users`,
    {
      method: "GET",
      credentials: "include",
      signal,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Unable to retrieve ThreatLens users."
    );
  }

  return data;
}
