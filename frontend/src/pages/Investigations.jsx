import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { investigateClientEvent } from "../services/investigations";
import "./Investigations.css";

function displayValue(value) {
  return value == null || value === "" ? "Not available" : String(value);
}

function parseAiInvestigation(text) {
  const sections = {
    assessment: [],
    findings: [],
    steps: [],
    limitations: [],
  };

  if (typeof text !== "string" || !text.trim()) {
    return sections;
  }

  let currentSection = "assessment";

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const plain = line
      .replace(/^#{1,6}\s*/, "")
      .replace(/\*\*/g, "")
      .trim();

    const headingMatch = plain.match(
      /^(?:\d+[.)]\s*)?(assessment|security assessment|investigation assessment|summary|investigation summary|overview|analysis|key findings|findings|observed facts|supporting evidence|evidence|potential threats?|recommended next steps|recommended investigation steps|recommended actions|recommendations|next steps|suggested actions|action items|limitations|caveats)(?:\s*:\s*(.*))?$/i
    );

    if (headingMatch) {
      const heading = headingMatch[1].toLowerCase();

      if (
        heading.includes("finding") ||
        heading.includes("fact") ||
        heading.includes("evidence") ||
        heading.includes("threat")
      ) {
        currentSection = "findings";
      } else if (
        heading.includes("recommend") ||
        heading.includes("step") ||
        heading.includes("action")
      ) {
        currentSection = "steps";
      } else if (
        heading.includes("limitation") ||
        heading.includes("caveat")
      ) {
        currentSection = "limitations";
      } else {
        currentSection = "assessment";
      }

      if (headingMatch[2]?.trim()) {
        sections[currentSection].push(headingMatch[2].trim());
      }
      continue;
    }

    const cleaned = plain
      .replace(/^[-*•]\s*/, "")
      .replace(/^\d+[.)]\s*/, "")
      .trim();

    if (cleaned) {
      sections[currentSection].push(cleaned);
    }
  }

  return sections;
}

function Investigations({ event, events = [], onBack, caseRecord }) {
  const canEdit = caseRecord?.can_edit === true;
  const caseKey =
    event?.id && event.clientId != null
      ? `${event.clientId}:${event.id}`
      : null;

  // Keep results local to their specific case so a late response cannot
  // accidentally appear in a different investigation.
  const [aiView, setAiView] = useState({
    key: null,
    result: null,
    loading: false,
    error: "",
  });
  const [viewedEvent, setViewedEvent] = useState(null);
  const autoRequestedRef = useRef(new Set());
  const inFlightRef = useRef(new Set());
  const activeCaseRef = useRef(caseKey);
  const mountedRef = useRef(false);

  activeCaseRef.current = caseKey;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setAiView({
      key: caseKey,
      result: null,
      loading: false,
      error: "",
    });
    setViewedEvent(null);
  }, [caseKey]);

  const aiResult =
    aiView.key === caseKey && aiView.result !== null
      ? aiView.result
      : caseRecord?.ai_result || "";
  const aiLoading = aiView.key === caseKey && aiView.loading;
  const aiError = aiView.key === caseKey ? aiView.error : "";
  const serverGenerating = caseRecord?.ai_state === "generating";

  // Correlate by known username and client, NOT merely by event type or IP.
  const relatedEvents = useMemo(() => {
    if (!event) return [];

    const selectedUsername = String(event.username || "")
      .trim()
      .toLowerCase();
    const hasKnownUsername =
      !!selectedUsername &&
      !["unknown", "not available", "n/a"].includes(selectedUsername);

    const unique = new Map();

    for (const item of [event, ...events]) {
      if (!item?.id) continue;

      const sameClient =
        String(item.clientId) === String(event.clientId);
      const isSelected = String(item.id) === String(event.id);
      const sameUsername =
        hasKnownUsername &&
        String(item.username || "").trim().toLowerCase() ===
          selectedUsername;

      if (sameClient && (isSelected || sameUsername)) {
        if (!unique.has(item.id)) {
          unique.set(item.id, item);
        }
      }
    }

    return [...unique.values()].sort((a, b) => {
      const aTime = Date.parse(a.timestamp);
      const bTime = Date.parse(b.timestamp);

      if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
        return bTime - aTime;
      }

      return String(b.timestamp || "").localeCompare(
        String(a.timestamp || "")
      );
    });
  }, [event, events]);

  const parsedAi = useMemo(() => parseAiInvestigation(aiResult), [aiResult]);

  const handleGenerateInvestigation = useCallback(
    async (regenerate = false) => {
      if (
        !canEdit ||
        !event?.id ||
        event.clientId == null ||
        !caseKey ||
        inFlightRef.current.has(caseKey)
      ) {
        return;
      }

      const requestedKey = caseKey;
      inFlightRef.current.add(requestedKey);

      setAiView((previous) => ({
        key: requestedKey,
        result:
          previous.key === requestedKey ? previous.result : null,
        loading: true,
        error: "",
      }));

      try {
        const response = await investigateClientEvent(
          event.clientId,
          event.id,
          undefined,
          regenerate
        );

        if (mountedRef.current && activeCaseRef.current === requestedKey) {
          setAiView({
            key: requestedKey,
            result: response.investigation || "",
            loading: false,
            error: "",
          });
        }
      } catch (error) {
        if (mountedRef.current && activeCaseRef.current === requestedKey) {
          setAiView((previous) => ({
            key: requestedKey,
            result:
              previous.key === requestedKey ? previous.result : null,
            loading: false,
            error:
              error.status === 409
                ? "Analysis is already running, or this investigation cannot be modified."
                : error.message || "Unable to generate AI analysis.",
          }));
        }
      } finally {
        inFlightRef.current.delete(requestedKey);
      }
    },
    [canEdit, caseKey, event?.clientId, event?.id]
  );

  // Make one automatic request when the owner opens a case without saved AI.
  // The backend returns a saved response, if available, without another AI call.
  useEffect(() => {
    if (
      !caseKey ||
      !caseRecord ||
      !canEdit ||
      caseRecord.ai_result ||
      caseRecord.ai_state === "generating" ||
      autoRequestedRef.current.has(caseKey)
    ) {
      return;
    }

    autoRequestedRef.current.add(caseKey);
    void handleGenerateInvestigation(false);
  }, [caseKey, caseRecord, canEdit, handleGenerateInvestigation]);

  if (!event) {
    return (
      <section className="investigation-page">
        <button
          type="button"
          className="investigation-back"
          onClick={onBack}
        >
          ← Back to Investigations
        </button>
        <h1 className="investigation-title">Security Investigation</h1>
        <p>Select an investigation to view its security evidence.</p>
      </section>
    );
  }

  // Detail view uses only fields currently supplied by ThreatLens.
  // A future authorized backend endpoint can add more original Splunk data.
  if (viewedEvent) {
    const detailFields = [
      ["Event ID", viewedEvent.id],
      ["Event Type", viewedEvent.eventType],
      ["Username", viewedEvent.username],
      ["Source IP", viewedEvent.sourceIP],
      ["Timestamp", viewedEvent.timestamp],
      ["Severity", viewedEvent.severity],
      ["Event Result", viewedEvent.status],
      ["Description", viewedEvent.description],
    ];

    return (
      <section className="investigation-page">
        <button
          type="button"
          className="investigation-back"
          onClick={() => setViewedEvent(null)}
        >
          ← Back to Investigation
        </button>
        <h1 className="investigation-title">IAM Event Details</h1>

        <div className="investigation-card investigation-event-view">
          <h2>Security Event Evidence</h2>
          {detailFields.map(([label, value]) => (
            <div className="investigation-detail-row" key={label}>
              <span>{label}</span>
              <strong>{displayValue(value)}</strong>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const severity = String(event.severity || "Unknown");
  const lowerSeverity = severity.toLowerCase();
  const severityClass = ["low", "medium", "high"].includes(lowerSeverity)
    ? lowerSeverity
    : "unknown";

  const caseStatus = String(caseRecord?.status || "investigating");
  const caseStatusLabel =
    caseStatus === "review"
      ? "Review"
      : caseStatus === "verified"
        ? "Verified"
        : "Investigating";

  return (
    <section className="investigation-page">
      <button
        type="button"
        className="investigation-back"
        onClick={onBack}
      >
        ← Back to Investigations
      </button>

      <h1 className="investigation-title">Security Investigation</h1>

      <div className="investigation-main-grid">
        <div className="investigation-left-column">
          <div className="investigation-card">
            <h2>Selected Event</h2>

            <div className="investigation-detail-row">
              <span>Event ID</span>
              <strong>{displayValue(event.id)}</strong>
            </div>
            <div className="investigation-detail-row">
              <span>Event Type</span>
              <strong>{displayValue(event.eventType)}</strong>
            </div>
            <div className="investigation-detail-row">
              <span>Username</span>
              <strong>{displayValue(event.username)}</strong>
            </div>
            <div className="investigation-detail-row">
              <span>Source IP</span>
              <strong>{displayValue(event.sourceIP)}</strong>
            </div>
            <div className="investigation-detail-row">
              <span>Timestamp</span>
              <strong>{displayValue(event.timestamp)}</strong>
            </div>
            <div className="investigation-detail-row">
              <span>Severity</span>
              <strong>
                <span
                  className={`investigation-severity investigation-severity-${severityClass}`}
                >
                  {severity}
                </span>
              </strong>
            </div>
            <div className="investigation-detail-row">
              <span>Status</span>
              <strong
                className={`investigation-status investigation-status-${caseStatus}`}
              >
                <span className="investigation-status-dot" />
                {caseStatusLabel}
              </strong>
            </div>
          </div>

          <div className="investigation-card">
	     <h2>Related User Activity</h2>
            <div className="investigation-timeline">
              {relatedEvents.length === 0 ? (
                <p className="investigation-muted">
                  No user activity is currently available.
                </p>
              ) : (
                relatedEvents.map((item) => {
                  const type = String(item.eventType || "");
                  const dotClass =
                    type === "LOGIN_SUCCESS"
                      ? "success"
                      : type === "LOGIN_FAILURE"
                        ? "failure"
                        : type === "UNAUTHORIZED_ACCESS"
                          ? "unauthorized"
                          : "neutral";

                  return (
                    <button
                      type="button"
                      className="investigation-timeline-item"
                      key={item.id}
                      onClick={() => setViewedEvent(item)}
                      aria-label={`View details for event ${item.id}`}
                    >
                      <span
                        className={`investigation-timeline-dot investigation-timeline-dot-${dotClass}`}
                        aria-hidden="true"
                      />
                      <span className="investigation-timeline-time">
                        {displayValue(item.timestamp)}
                      </span>
                      <span className="investigation-timeline-content">
                        <strong>{displayValue(item.eventType)}</strong>
                        <small>
                          {item.description || displayValue(item.sourceIP)}
                        </small>
                      </span>
                      <span
                        className="investigation-timeline-arrow"
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="investigation-card investigation-ai-card">
          <div className="investigation-ai-header">
            <div className="investigation-ai-heading">
              <span className="investigation-ai-icon" aria-hidden="true">
                ✧
              </span>
              <div>
                <h2>AI Investigation</h2>
                <p className="investigation-muted">
                  AI assessment based on available IAM security evidence.
                </p>
              </div>
            </div>

            {canEdit && (
              <button
                type="button"
                className="investigation-ai-button"
                onClick={() => handleGenerateInvestigation(true)}
                disabled={aiLoading || (serverGenerating && !aiLoading)}
              >
                {aiLoading || (serverGenerating && !aiResult)
                  ? "Analyzing..."
                  : "↻ Run analysis again"}
              </button>
            )}
          </div>

          {aiLoading && (
            <p className="investigation-ai-message" role="status">
              Analyzing security evidence and saving the assessment...
            </p>
          )}

          {aiError && (
            <p className="investigation-ai-error" role="alert">
              {aiError}
            </p>
          )}

          {!aiResult && !aiLoading && (
            <p className="investigation-ai-message" role="status">
              {serverGenerating
                ? "AI analysis is in progress. The saved results will appear when the investigation list refreshes."
                : canEdit
                  ? aiError
                    ? "The assessment could not be completed. Use Run analysis again to retry."
                    : "Preparing the AI investigation..."
                  : "No saved AI assessment is available for this investigation."}
            </p>
          )}

          {aiResult && (
            <div className="investigation-ai-results">
              <div className="investigation-ai-section">
                <h3>ASSESSMENT</h3>
                {parsedAi.assessment.length > 0 ? (
                  parsedAi.assessment.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))
                ) : (
                  <p className="investigation-muted">
                    No separate assessment was provided.
                  </p>
                )}
              </div>

              <div className="investigation-ai-section">
                <h3>KEY FINDINGS</h3>
                {parsedAi.findings.length > 0 ? (
                  <ul>
                    {parsedAi.findings.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="investigation-muted">
                    No separate findings were provided.
                  </p>
                )}
              </div>

              <div className="investigation-ai-section">
                <h3>RECOMMENDED NEXT STEPS</h3>
                {parsedAi.steps.length > 0 ? (
                  <ol>
                    {parsedAi.steps.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="investigation-muted">
                    No separate next steps were provided.
                  </p>
                )}
              </div>

              {parsedAi.limitations.length > 0 && (
                <div className="investigation-ai-section">
                  <h3>LIMITATIONS</h3>
                  {parsedAi.limitations.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              )}

              <p className="investigation-ai-disclaimer">
                AI-generated findings require analyst verification.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="investigation-card investigation-report-bar">
        <span className="investigation-report-icon" aria-hidden="true">
          ✎
        </span>
        <textarea
          aria-label="Investigation notes"
          placeholder="Add investigation notes, findings, or next steps..."
          rows={3}
          disabled
        />
        <button type="button" disabled>
          Submit Report
        </button>
      </div>
    </section>
  );
}

export default Investigations;
