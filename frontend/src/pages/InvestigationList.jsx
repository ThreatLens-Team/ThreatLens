import { useEffect, useState } from "react";
import {
  getClientCases,
  openClientCase,
} from "../services/cases";

import "./InvestigationList.css";

export default function InvestigationList({
  clientId,
  clientName,
  events = [],
  onOpenCase,
}) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showPicker, setShowPicker] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Load investigations for the selected client.
  useEffect(() => {
    const controller = new AbortController();

    setCases([]);
    setError("");
    setLoading(true);
    setShowPicker(false);
    setSelectedEventId("");

    if (!clientId) {
      setLoading(false);
      return () => controller.abort();
    }

    getClientCases(clientId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCases(data.cases || []);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [clientId]);

  // Create a case, or open the existing shared case.
  async function handleCreateCase(e) {
    e.preventDefault();

    if (!selectedEventId || !clientId || creating) return;

    setCreating(true);
    setCreateError("");

    try {
      const result = await openClientCase(
        clientId,
        selectedEventId
      );

      // The backend determines the owner.
      // An existing case cannot be taken over.
      onOpenCase(result.case);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const activeCount = cases.filter(
    (item) =>
      item.status === "investigating" ||
      item.status === "review"
  ).length;

  function statusLabel(status) {
    const labels = {
      investigating: "Investigating",
      review: "Review",
      verified: "Verified",
    };

    return labels[status] || status;
  }

  return (
    <section className="case-list-panel">
      <div className="case-list-header">
        <div>
          <h2>Active Investigations</h2>
          <p>
            Investigations opened and visible in the{" "}
            {clientName || "selected"} workspace.
          </p>
          <span className="case-list-count">
            {activeCount} active investigations
          </span>
        </div>

        <button
          type="button"
          className="case-new-button"
          onClick={() => {
            setShowPicker((current) => !current);
            setCreateError("");
          }}
          disabled={!clientId}
        >
          + New Investigation
        </button>
      </div>

      {showPicker && (
        <form
          className="case-event-picker"
          onSubmit={handleCreateCase}
        >
          <label htmlFor="case-event-select">
            Choose a security event to investigate
          </label>

          <select
            id="case-event-select"
            value={selectedEventId}
            onChange={(e) =>
              setSelectedEventId(e.target.value)
            }
            required
          >
            <option value="">Select an event...</option>

            {events.map((event) => (
	      <option key={event.id} value={event.id}>
                {event.id} — {event.event_type} — {event.username || "Unknown user"} — {event.severity || "Unknown"} Risk
              </option>	
            ))}
          </select>

          <p>
            You may select Low, Medium, High, or
            unclassified events.
          </p>

          {createError && (
            <p role="alert">{createError}</p>
          )}

          <button
            type="submit"
            className="case-new-button"
            disabled={
              !selectedEventId || creating
            }
          >
            {creating
              ? "Opening..."
              : "Start Investigation"}
          </button>
        </form>
      )}

      {loading && (
        <p role="status">Loading investigations...</p>
      )}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && (
        <div className="case-table-scroll">
          <table className="case-table">
            <thead>
              <tr>
                <th>Investigation ID</th>
                <th>Event ID</th>
                <th>Event Type</th>
                <th>Owner</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td>
                    <button
                      type="button"
                      className="case-id-button"
                      onClick={() => onOpenCase(item)}
                    >
                      INV-{String(item.id).padStart(4, "0")}
                    </button>
                  </td>

                  <td>{item.event_id}</td>

                  <td>
                    {item.event?.event_type || "UNKNOWN"}
                  </td>

                  <td>{item.owner}</td>

                  <td>
                    <span
                      className={`case-status case-status-${item.status}`}
                    >
                      <span
                        className="case-status-dot"
                        aria-hidden="true"
                      />
                      {statusLabel(item.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {cases.length === 0 && (
            <p className="case-empty">
              No investigations have been opened
              for this client yet.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
