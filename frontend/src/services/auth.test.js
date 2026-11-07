
import { afterEach, describe, expect, it, vi } from "vitest";
import { login } from "./auth";

describe("ThreatLens Authentication Service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("login_invalidCredentials_returnsError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          detail: "Incorrect credentials",
        }),
      })
    );

    await expect(
      login("analyst@example.com", "wrongpassword")
    ).rejects.toThrow("Invalid email or password.");

    expect(fetch).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL}/api/auth/login`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          email: "analyst@example.com",
          password: "wrongpassword",
        }),
      })
    );
  });

  it("login_validCredentials_returnsUser", async () => {
    const mockUser = {
      id: 1,
      email: "analyst@example.com",
      role: "analyst",
    };
  
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          user: mockUser,
        }),
      })
    );
  
    const result = await login(
      "analyst@example.com",
      "correctpassword"
    );
  
    expect(result.user).toEqual(mockUser);
  
    expect(fetch).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL}/api/auth/login`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "analyst@example.com",
          password: "correctpassword",
        }),
      })
    );
  });
  

  
});
