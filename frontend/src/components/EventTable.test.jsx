
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";

import EventTable from "./EventTable";
import { mockEvents } from "../data/mockEvents";

describe("ThreatLens Security Event Table", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderTable(events = mockEvents) {
    const onInvestigate = vi.fn();

    render(
      <EventTable
        events={events}
        onInvestigate={onInvestigate}
        source="demo"
      />
    );

    return { onInvestigate };
  }

  it("eventTable_initialLoad_displaysAllEvents", () => {
    renderTable();

    expect(screen.getByText("6 events")).toBeTruthy();

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(7); // Header + 6 events
  });

  it("eventTable_searchUsername_returnsMatchingEvents", () => {
    renderTable();

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: "Search security events",
      }),
      { target: { value: "noah.wells" } }
    );

    expect(screen.getByText("2 events")).toBeTruthy();

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3); // Header + 2 matching events

    expect(screen.queryByText("maya.chen")).toBeNull();
  });

  it("eventTable_filterSeverity_returnsHighRiskEvents", () => {
    renderTable();

    fireEvent.change(
      screen.getByLabelText("Severity:"),
      { target: { value: "High" } }
    );

    expect(screen.getByText("2 events")).toBeTruthy();

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);

    expect(screen.queryByText("maya.chen")).toBeNull();
  });

  it("eventTable_filterEventType_returnsLoginFailures", () => {
    renderTable();

    fireEvent.change(
      screen.getByLabelText("Event Type:"),
      { target: { value: "LOGIN_FAILURE" } }
    );

    expect(screen.getByText("2 events")).toBeTruthy();

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);

    expect(screen.queryByText("svc.deploy")).toBeNull();
  });

  it("eventTable_noMatchingEvents_displaysEmptyMessage", () => {
    renderTable();

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: "Search security events",
      }),
      { target: { value: "unknown.user" } }
    );

    expect(
      screen.getByText("No events match your search or filter.")
    ).toBeTruthy();

    expect(screen.getByText("0 events")).toBeTruthy();
  });

  it("eventTable_investigateClick_passesSelectedEvent", () => {
    const { onInvestigate } = renderTable();

    const rows = screen.getAllByRole("row");
    const firstEventRow = rows[1];

    fireEvent.click(
      within(firstEventRow).getByRole("button", {
        name: "Investigate",
      })
    );

    expect(onInvestigate).toHaveBeenCalledTimes(1);
    expect(onInvestigate).toHaveBeenCalledWith(mockEvents[0]);
  });
});
