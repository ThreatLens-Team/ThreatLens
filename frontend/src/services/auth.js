
const API_URL = import.meta.env.VITE_API_URL;

async function authRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Invalid email or password."
        : data.detail || "Authentication request failed."
    );
  }

  return data;
}

export function login(email, password) {
  return authRequest("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser() {
  return authRequest("/api/auth/me");
}

export function logout() {
  return authRequest("/api/auth/logout", {
    method: "POST",
  });
}
