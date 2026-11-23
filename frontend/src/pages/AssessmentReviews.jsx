import { useState } from "react";
import "./AssessmentReviews.css";

// Temporary demonstration reports.
// These will be replaced with backend data later.
const sampleAssessments = [
  {
    id: "DEMO-001",
    eventId: "B-001",
    client: "Demo Company B",
    eventType: "LOGIN_FAILURE",
    analyst: "demo.analyst",
    severity: "Medium",
    status: "Pending Review",
    summary:
      "Multiple unsuccessful authentication attempts were detected for a user account.",
    findings:
      "The authentication activity should be reviewed to determine whether the failures were caused by a legitimate user or suspicious access attempts.",
    recommendation:
      "Review related login activity and verify whether the account owner recognizes the attempts.",
    notes:
      "Additional investigation may be necessary before closing this case.",
  },
  {
    id: "DEMO-002",
    eventId: "EVT-002",
    client: "Vet Clinic",
    eventType: "UNAUTHORIZED_ACCESS",
    analyst: "demo.analyst",
    severity: "High",
    status: "Approved",
    summary:
      "An account attempted to access a restricted resource.",
    findings:
      "The access attempt was denied by the application's authorization controls.",
    recommendation:
      "Review the user's assigned permissions and monitor for repeated unauthorized attempts.",
    notes: "Example of a previously approved assessment.",
  },
  {
    id: "DEMO-003",
    eventId: "EVT-003",
    client: "Vet Clinic",
    eventType: "ROLE_CHANGE",
    analyst: "demo.analyst",
    severity: "Medium",
    status: "Needs Revision",
    summary:
      "A user role change was recorded in the demonstration data.",
    findings:
      "The reason for the role change requires additional verification.",
    recommendation:
      "Confirm the change was authorized and document the approval.",
    notes: "Example of an assessment requiring revisions.",
  },
];

function AssessmentReviews() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("All");
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  const pendingAssessments = sampleAssessments.filter(
    (assessment) => assessment.status === "Pending Review"
  );

  const assessmentHistory = sampleAssessments.filter(
    (assessment) =>
      assessment.status === "Approved" ||
      assessment.status === "Needs Revision"
  );

  const filteredHistory = assessmentHistory.filter(
    (assessment) =>
      historyFilter === "All" ||
      assessment.status === historyFilter
  );

  const countStatus = (status) =>
    sampleAssessments.filter(
      (assessment) => assessment.status === status
    ).length;

  // Reuse the same table for pending and historical reports.
  const renderAssessmentTable = (assessments) => (
    <div className="assessment-table-wrapper">
      <table className="assessment-table">
        <thead>
          <tr>
            <th>Event ID</th>
            <th>Client</th>
            <th>Event Type</th>
            <th>Analyst</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {assessments.map((assessment) => (
            <tr key={assessment.id}>
              <td>{assessment.eventId}</td>
              <td>{assessment.client}</td>
              <td>{assessment.eventType}</td>
              <td>{assessment.analyst}</td>
              <td>
                <span
                  className={`assessment-status ${
                    assessment.status
                      .toLowerCase()
                      .replaceAll(" ", "-")
                  }`}
                >
                  {assessment.status}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  className="assessment-view-button"
                  onClick={() =>
                    setSelectedAssessment(assessment)
                  }
                >
                  View Assessment
                </button>
              </td>
            </tr>
          ))}

          {assessments.length === 0 && (
            <tr>
              <td colSpan={6}>
                No assessments to display.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="assessment-reviews">
      <h2>Assessment Reviews</h2>
      <p className="assessment-description">
        Review security investigation reports submitted by analysts.
      </p>

      <p className="assessment-demo-notice">
        Demonstration data only — reports and review decisions
        are not connected to the backend.
      </p>

      {/* Summary cards */}
      <div className="assessment-stats">
        <div className="assessment-stat-card">
          <h3>{countStatus("Pending Review")}</h3>
          <p>Pending Review</p>
        </div>

        <div className="assessment-stat-card">
          <h3>{countStatus("Approved")}</h3>
          <p>Approved</p>
        </div>

        <div className="assessment-stat-card">
          <h3>{countStatus("Needs Revision")}</h3>
          <p>Needs Revision</p>
        </div>
      </div>

      {/* Reports awaiting administrator review */}
      <div className="assessment-panel">
        <div className="assessment-panel-header">
          <div>
            <h3>Pending Assessments</h3>
            <p className="assessment-section-description">
              Reports awaiting administrator review and approval.
            </p>
          </div>

          <span className="assessment-pending-count">
            {pendingAssessments.length} Pending
          </span>
        </div>

        {renderAssessmentTable(pendingAssessments)}
      </div>

      {/* Previously reviewed reports */}
      <div className="assessment-panel">
        <div className="assessment-history-header">
          <div>
            <h3>Assessment History</h3>
            <p className="assessment-section-description">
              Previously approved reports and assessments
              returned for revision.
            </p>
          </div>

          <button
            type="button"
            className="assessment-view-button"
            aria-expanded={historyOpen}
            aria-controls="assessment-history-content"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            {historyOpen ? "Hide History" : "View History"}
            {" "}
            ({assessmentHistory.length})
          </button>
        </div>

        {historyOpen && (
          <div
            id="assessment-history-content"
            className="assessment-history-content"
          >
            <div className="assessment-history-toolbar">
              <label htmlFor="assessment-history-filter">
                Filter by Status
              </label>

              <select
                id="assessment-history-filter"
                value={historyFilter}
                onChange={(event) =>
                  setHistoryFilter(event.target.value)
                }
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Needs Revision">
                  Needs Revision
                </option>
              </select>
            </div>

            {renderAssessmentTable(filteredHistory)}
          </div>
        )}
      </div>

      {/* Read-only assessment details */}
      {selectedAssessment && (
        <div className="assessment-panel assessment-detail">
          <div className="assessment-panel-header">
            <h3>
              Investigation Report — {selectedAssessment.eventId}
            </h3>

            <button
              type="button"
              className="assessment-view-button"
              onClick={() => setSelectedAssessment(null)}
            >
              Close
            </button>
          </div>

          <div className="assessment-detail-grid">
            <div>
              <span>Client</span>
              <strong>{selectedAssessment.client}</strong>
            </div>
            <div>
              <span>Analyst</span>
              <strong>{selectedAssessment.analyst}</strong>
            </div>
            <div>
              <span>Event Type</span>
              <strong>{selectedAssessment.eventType}</strong>
            </div>
            <div>
              <span>Severity</span>
              <strong>{selectedAssessment.severity}</strong>
            </div>
            <div>
              <span>Review Status</span>
              <strong>{selectedAssessment.status}</strong>
            </div>
          </div>

          <div className="assessment-report-section">
            <h4>Investigation Summary</h4>
            <p>{selectedAssessment.summary}</p>
          </div>

          <div className="assessment-report-section">
            <h4>Analyst Findings</h4>
            <p>{selectedAssessment.findings}</p>
          </div>

          <div className="assessment-report-section">
            <h4>Recommended Actions</h4>
            <p>{selectedAssessment.recommendation}</p>
          </div>

          <div className="assessment-report-section">
            <h4>Analyst Notes</h4>
            <p>{selectedAssessment.notes}</p>
          </div>

          <div className="assessment-review-actions">
            <p>
              Approval and revision actions will be enabled
              when the backend review workflow is connected.
            </p>

            <button type="button" disabled>
              Approve Assessment
            </button>

            <button type="button" disabled>
              Request Revision
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssessmentReviews;
