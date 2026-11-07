
import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientEvents } from "./clients";

describe("ThreatLens Client Access Service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getClientEvents_validClient_returnsEvents", async () => {
    const mockEvents = [
      {
        event_id: "EVT-001",
        client_id: "company-b",
        event_type: "LOGIN_FAILURE",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockEvents,
      })
    );

    const result = await getClientEvents("company-b");

    expect(result).toEqual(mockEvents);

    expect(fetch).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL}/api/clients/company-b/events`,
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      })
    );
  });

  it("getClientEvents_unauthorizedClient_returns403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          detail: "Access denied to this client.",
        }),
      })
    );

    await expect(
      getClientEvents("restricted-company")
    ).rejects.toMatchObject({
      message: "Access denied to this client.",
      status: 403,
    });

    expect(fetch).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL}/api/clients/restricted-company/events`,
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      })
    );
  });
});
