
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import Investigations from "./Investigations";
import { investigateClientEvent } from "../services/investigations";

vi.mock("../services/investigations", () => ({
  investigateClientEvent: vi.fn(),
}));

const selectedEvent = {
  id: "EVT-001",
  clientId: "company-a",
  timestamp: "2026-10-25 14:32:18",
  eventType: "UNAUTHORIZED_ACCESS",
  username: "noah.wells",
  sourceIP: "198.51.100.42",
  severity: "High",
  status: "Unresolved",
};

const relatedEvents = [
  selectedEvent,
  {
    id: "EVT-002",
    clientId: "company-a",
    timestamp: "2026-10-25 14:29:03",
    eventType: "LOGIN_FAILURE",
    username: "noah.wells",
    sourceIP: "198.51.100.42",
    severity: "High",
    status: "Investigating",
  },
  {
    id: "EVT-003",
    clientId: "company-b",
    timestamp: "2026-10-25 14:21:45",
    eventType: "ACCOUNT_CREATED",
    username: "noah.wells",
    sourceIP: "198.51.100.42",
    severity: "Medium",
    status: "Review",
  },
];

describe("ThreatLens Investigation Page", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("investigation_selectedEvent_displaysCorrectDetails", () => {
    render(
      <Investigations
        event={selectedEvent}
        events={relatedEvents}
        onBack={vi.fn()}
      />
    );

    const details = screen.getByText("Event Details").parentElement;

    expect(within(details).getByText("EVT-001")).toBeTruthy();
    expect(
      within(details).getByText("UNAUTHORIZED_ACCESS")
    ).toBeTruthy();
    expect(within(details).getByText("noah.wells")).toBeTruthy();
    expect(
      within(details).getByText("198.51.100.42")
    ).toBeTruthy();

    expect(screen.getByText("High Risk")).toBeTruthy();
  });

  it("investigation_noSelectedEvent_displaysMessage", () => {
    render(
      <Investigations
        event={null}
        events={[]}
        onBack={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        "Select an IAM event from the Overview dashboard."
      )
    ).toBeTruthy();
  });

  it("investigation_relatedEvents_filtersByClient", () => {
    render(
      <Investigations
        event={selectedEvent}
        events={relatedEvents}
        onBack={vi.fn()}
      />
    );

    const timeline = document.querySelector(".event-timeline");

    expect(
      within(timeline).getByText("LOGIN_FAILURE")
    ).toBeTruthy();

    expect(
      within(timeline).queryByText("ACCOUNT_CREATED")
    ).toBeNull();

    expect(
      timeline.querySelectorAll(".timeline-item")
    ).toHaveLength(1);
  });

  it("investigation_backButton_returnsToOverview", () => {
    const onBack = vi.fn();

    render(
      <Investigations
        event={selectedEvent}
        events={relatedEvents}
        onBack={onBack}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Back to Overview/i,
      })
    );

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("investigation_generateAI_displaysResult", async () => {
    vi.mocked(investigateClientEvent).mockResolvedValue({
      investigation: "Suspicious login activity detected.",
    });

    render(
      <Investigations
        event={selectedEvent}
        events={relatedEvents}
        onBack={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Generate AI Investigation",
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Suspicious login activity detected.")
      ).toBeTruthy();
    });

    expect(investigateClientEvent).toHaveBeenCalledWith(
      "company-a",
      "EVT-001",
      expect.any(AbortSignal)
    );
  });

  it("investigation_generateAI_failureDisplaysError", async () => {
    vi.mocked(investigateClientEvent).mockRejectedValue(
      new Error("Investigation service unavailable")
    );

    render(
      <Investigations
        event={selectedEvent}
        events={relatedEvents}
        onBack={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Generate AI Investigation",
      })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("alert").textContent
      ).toContain("Investigation service unavailable");
    });
  });
});
