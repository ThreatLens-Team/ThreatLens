import { useMemo, useState } from "react";
import "./EventTable.css";

function EventTable({ events = [], onInvestigate, source = "" }) {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("All");
  const [eventType, setEventType] = useState("All");

  const eventTypes = [
    "All",
    ...new Set(events.map((event) => event.eventType)),
  ];

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const searchText = search.trim().toLowerCase();

      const matchesSearch =
        String(event.username).toLowerCase().includes(searchText) ||
        String(event.eventType).toLowerCase().includes(searchText) ||
        String(event.sourceIP).toLowerCase().includes(searchText) ||
        String(event.id).toLowerCase().includes(searchText);

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
  }, [events, search, severity, eventType]);

  return (
    <section className="events-panel">
      <div className="events-header">
        <div>
          <h3>Recent Security Events</h3>
          <p>
            {source === "demo"
              ? "Demonstration IAM activity — sample events"
              : "Security events for the selected client"}
          </p>
        </div>

        <input
          className="events-search"
          type="search"
          placeholder="Search events..."
          aria-label="Search security events"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="events-toolbar">
        <label htmlFor="severity-filter">
          Severity:
        </label>

        <select
          id="severity-filter"
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
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
          onChange={(event) => setEventType(event.target.value)}
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
                <td>
        <span
          className={`tl-event-status tl-event-status-${String(
              event.status || "Open"
          ).toLowerCase().replace(/[^a-z]/g, "-")}`}
          >
          <span
              className="tl-event-status-dot"
              aria-hidden="true"
          />
          {event.status || "Open"}
        </span>
    </td>
                <td className="events-action-cell">
        {event.severity === "High" ||
        event.severity === "Medium" ? (
             <button
                 type="button"
                 className="investigate-btn"
                       onClick={() => onInvestigate(event)}
             >
                {["Pending", "Review", "Verified"].includes(
                        event.status
                      )
                        ? "View Case"
                        : "Investigate"}
                     </button>
                   ) : (
                     <span
                       className="events-action-ellipsis"
                       title="Not recommended for investigation. Use New Investigation to select this event manually."
                       aria-label="No recommended investigation action"
             >
               ...
                  </span>
        )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEvents.length === 0 && (
          <p className="events-empty">
            {events.length === 0
              ? "No events were returned for this client."
              : "No events match your search or filter."}
          </p>
        )}
      </div>
    </section>
  );
}

export default EventTable;


