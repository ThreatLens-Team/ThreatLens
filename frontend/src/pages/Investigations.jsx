import { useEffect, useRef, useState } from "react";
import { investigateClientEvent } from "../services/investigations";
import "./Investigations.css";


function Investigations({
    event,
    events = [],
    onBack,
    caseRecord,
  }) {
    const canEdit = caseRecord?.can_edit === true;

  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const requestRef = useRef(null);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  const handleGenerateInvestigation = async () => {
    if (!event?.id || event.clientId == null || aiLoading) {
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;

    setAiLoading(true);
    setAiError("");
    setAiResult("");

    try {
      const result = await investigateClientEvent(
        event.clientId,
        event.id,
        controller.signal
      );

      if (!controller.signal.aborted) {
        setAiResult(result.investigation);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setAiError(error.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setAiLoading(false);
      }
    }
  };

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

  const relatedEvents = events
  .filter((item) => {
    if (item.clientId !== event.clientId) {
      return false;
    }

    if (item.id === event.id) {
      return false;
    }

    const sameUsername =
      event.username !== "Unknown" &&
      item.username === event.username;

    const sameIP =
      event.sourceIP !== "Not available" &&
      item.sourceIP === event.sourceIP;

    return sameUsername || sameIP;
  })
  .sort((a, b) =>
    String(b.timestamp).localeCompare(String(a.timestamp))
  );

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

        <p>
          Generate an AI-assisted investigation of this
          client's selected IAM security event.
        </p>

        {canEdit ? (
      <button
          type="button"
          className="investigation-back"
          onClick={handleGenerateInvestigation}
          disabled={aiLoading}
          >
           {aiLoading
             ? "Generating Investigation..."
              : "Generate AI Investigation"}
          </button>
        ) : (
          <p className="investigation-readonly">
            <strong>Read-only investigation</strong>
            <span>
              You can review this investigation, but only
              its assigned analyst can generate or modify
              AI findings while the case is investigating.
            </span>
          </p>
        )}
        {aiLoading && (
          <p role="status">
            Analyzing security evidence. Please wait...
          </p>
        )}

        {aiError && (
          <p role="alert">
            Unable to generate investigation: {aiError}
          </p>
        )}

        {aiResult && (
          <div className="ai-result">
            <h3>AI Investigation Results</h3>
            <p>
              AI-generated assessment based on the
              available demonstration evidence.
              Findings require analyst review.
            </p>
            <pre style={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              fontFamily: "inherit",
              lineHeight: 1.7
            }}>
              {aiResult}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}

export default Investigations;
