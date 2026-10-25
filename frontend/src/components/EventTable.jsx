
import { useMemo, useState } from "react";
import { mockEvents } from "../data/mockEvents";
import "./EventTable.css";

function EventTable({ onInvestigate }) {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("All");
  const [eventType, setEventType] = useState("All");

  const eventTypes = [
    "All",
    "LOGIN_FAILURE",
    "LOGIN_SUCCESS",
    "UNAUTHORIZED_ACCESS",
    "ACCOUNT_CREATED",
    "LOGOUT",
  ];

  const filteredEvents = useMemo(() => {
    return mockEvents.filter((event) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        event.username.toLowerCase().includes(searchText) ||
        event.eventType.toLowerCase().includes(searchText) ||
        event.sourceIP.includes(searchText);

      const matchesSeverity =
        severity === "All" || event.severity === severity;

      const matchesEventType =
        eventType === "All" || event.eventType === eventType;

      return (
        matchesSearch &&
        matchesSeverity &&
        matchesEventType
      );
    });
  }, [search, severity, eventType]);

  const handleInvestigate = (event) => {
    alert(
      `Investigation page coming next!\n\n` +
      `Event ID: ${event.id}\n` +
      `Event Type: ${event.eventType}\n` +
      `User: ${event.username}`
    );
  };

  return (
    <section className="events-panel">
      <div className="events-header">
        <div>
          <h3>Recent Security Events</h3>
          <p>Demo IAM activity — sample data</p>
        </div>

        <input
          className="events-search"
          type="search"
          placeholder="Search events..."
          aria-label="Search security events"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="events-toolbar">
        <label htmlFor="severity-filter">
          Severity:
        </label>

        <select
          id="severity-filter"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="All">All severities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <label htmlFor="event-type-filter">
          Event Type:
        </label>

        <select
          id="event-type-filter"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        >
          {eventTypes.map((type) => (
            <option key={type} value={type}>
              {type === "All" ? "All event types" : type}
            </option>
          ))}
        </select>

        <span>{filteredEvents.length} events</span>
      </div>

      <div className="events-table-scroll">
        <table className="events-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Event Type</th>
              <th>Username</th>
              <th>Source IP</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredEvents.map((event) => (
              <tr key={event.id}>
                <td>{event.timestamp}</td>

                <td className="event-type">
                  {event.eventType}
                </td>

                <td>{event.username}</td>

                <td>{event.sourceIP}</td>

                <td>
                  <span
                    className={`severity-badge severity-${event.severity.toLowerCase()}`}
                  >
                    {event.severity}
                  </span>
                </td>

                <td>{event.status}</td>

                <td>
                  <button
                    type="button"
                    className="investigate-btn"
                    onClick={() => onInvestigate(event)}
                  >
                    Investigate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEvents.length === 0 && (
          <p className="events-empty">
            No events match your search or filter.
          </p>
        )}
      </div>
    </section>
  );
}

export default EventTable;

