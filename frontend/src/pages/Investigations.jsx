
import { mockEvents } from "../data/mockEvents";
import "./Investigations.css";

function Investigations({ event, onBack }) {
  if (!event) {
    return (
      <section className="investigation-page">
        <h1>Security Investigations</h1>
        <p>Select an IAM event from the Overview dashboard.</p>
        <button
          className="investigation-back"
          onClick={onBack}
        >
          Back to Overview
        </button>
      </section>
    );
  }

  const relatedEvents = mockEvents
    .filter(
      (item) =>
        item.username === event.username ||
        item.sourceIP === event.sourceIP
    )
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <section className="investigation-page">
      <button
        className="investigation-back"
        onClick={onBack}
      >
        ← Back to Overview
      </button>

      <div className="investigation-heading">
        <div>
          <h1>Security Investigation</h1>
          <p>Review IAM security evidence and account activity.</p>
        </div>

        <span className="investigation-demo">
          DEMO DATA
        </span>
      </div>

      <div className="investigation-grid">
        <div className="investigation-card">
          <h2>Event Details</h2>

          <div className="detail-row">
            <span>Event ID</span>
            <strong>{event.id}</strong>
          </div>

          <div className="detail-row">
            <span>Event Type</span>
            <strong>{event.eventType}</strong>
          </div>

          <div className="detail-row">
            <span>Username</span>
            <strong>{event.username}</strong>
          </div>

          <div className="detail-row">
            <span>Source IP</span>
            <strong>{event.sourceIP}</strong>
          </div>

          <div className="detail-row">
            <span>Timestamp</span>
            <strong>{event.timestamp}</strong>
          </div>

          <div className="detail-row">
            <span>Status</span>
            <strong>{event.status}</strong>
          </div>
        </div>

        <div className="investigation-card">
          <h2>Risk Assessment</h2>

          <div
            className={`risk-level risk-${event.severity.toLowerCase()}`}
          >
            {event.severity} Risk
          </div>

          <p>
            This severity is sample data assigned to the
            selected IAM event.
          </p>

          <p>
            Future ThreatLens risk assessments will consider
            account privileges, event patterns, and
            additional security evidence.
          </p>
        </div>
      </div>

      <div className="investigation-card">
        <h2>Related IAM Activity</h2>
        <p>
          Events associated with the selected username
          or source IP address.
        </p>

        <div className="event-timeline">
          {relatedEvents.map((item) => (
            <div className="timeline-item" key={item.id}>
              <div className="timeline-dot" />

              <div>
                <strong>{item.eventType}</strong>
                <p>{item.timestamp}</p>
                <span>
                  {item.username} — {item.sourceIP}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="investigation-card ai-panel">
        <h2>AI Security Analysis</h2>

        <span className="investigation-demo">
          SIMULATED ANALYSIS
        </span>

        <p>
          AI-powered investigation is not connected yet.
          This section will eventually display analysis
          generated using verified security evidence.
        </p>

        <h3>Future Investigation Capabilities</h3>

        <ul>
          <li>Explain suspicious authentication patterns.</li>
          <li>Evaluate account privileges and security context.</li>
          <li>Identify related IAM activity.</li>
          <li>Recommend investigation steps for analysts.</li>
        </ul>
      </div>
    </section>
  );
}

export default Investigations;
