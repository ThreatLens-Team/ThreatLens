
import { useEffect, useState } from "react";
import {
  getClients,
  getClientAssignments,
  createClient,
  getActiveAnalysts,
  assignAnalystToClient,
} from "../services/clients";

import "./ClientManagement.css";

function ClientManagement() {
  const [clients, setClients] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [analysts, setAnalysts] = useState([]);

  const [newClientName, setNewClientName] = useState("");
  const [selectedAnalystId, setSelectedAnalystId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        const [clientData, assignmentData, analystData] =
          await Promise.all([
            getClients(controller.signal),
            getClientAssignments(controller.signal),
            getActiveAnalysts(controller.signal),
          ]);

        if (controller.signal.aborted) return;

        setClients(clientData.clients || []);
        setAssignments(assignmentData.assignments || []);
        setAnalysts(analystData.analysts || []);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, []);

  async function handleCreateClient(event) {
    event.preventDefault();

    const name = newClientName.trim();
    if (!name || saving || loading) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const client = await createClient(name);

      setClients((previous) =>
        [...previous, client].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setNewClientName("");
      setMessage("Client created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const assignmentExists = assignments.some(
    (assignment) =>
      String(assignment.user_id) ===
        String(selectedAnalystId) &&
      String(assignment.client_id) ===
        String(selectedClientId)
  );

  async function handleAssignAnalyst(event) {
    event.preventDefault();

    if (
      !selectedAnalystId ||
      !selectedClientId ||
      assigning ||
      loading ||
      assignmentExists
    ) {
      return;
    }

    setAssigning(true);
    setError("");
    setMessage("");

    try {
      await assignAnalystToClient(
        selectedAnalystId,
        selectedClientId
      );

      const assignmentData = await getClientAssignments();

      setAssignments(assignmentData.assignments || []);

      setSelectedAnalystId("");
      setSelectedClientId("");

      setMessage("Analyst assigned successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="client-management">
      <h2>Client Management</h2>
      <p>
        Manage client organizations and analyst assignments.
      </p>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {/* REGISTER CLIENT */}
      <div className="client-management-section">
        <h3>Register New Client</h3>

        <form onSubmit={handleCreateClient}>
          <div className="client-management-field">
            <label htmlFor="new-client-name">
              Client Organization Name
            </label>

            <input
              id="new-client-name"
              type="text"
              placeholder="Enter client name..."
              value={newClientName}
              onChange={(event) =>
                setNewClientName(event.target.value)
              }
              maxLength={100}
              required
            />
          </div>

          <button type="submit" disabled={saving || loading}>
            {saving ? "Creating..." : "Add Client"}
          </button>
        </form>
      </div>

      {/* ASSIGN ANALYST */}
      <div className="client-management-section">
        <h3>Assign Analyst to Client</h3>

        <p className="client-management-description">
          Grant an existing security analyst access to a
          registered client organization.
        </p>

        <form onSubmit={handleAssignAnalyst}>
          <div className="client-management-field">
            <label htmlFor="assign-analyst">
              Security Analyst
            </label>

            <select
              id="assign-analyst"
              value={selectedAnalystId}
              onChange={(event) =>
                setSelectedAnalystId(event.target.value)
              }
              required
              disabled={loading || assigning}
            >
              <option value="">Select analyst...</option>

              {analysts.map((analyst) => (
                <option key={analyst.id} value={analyst.id}>
                  {analyst.email}
                </option>
              ))}
            </select>
          </div>

          <div className="client-management-field">
            <label htmlFor="assign-client">
              Client Organization
            </label>

            <select
              id="assign-client"
              value={selectedClientId}
              onChange={(event) =>
                setSelectedClientId(event.target.value)
              }
              required
              disabled={loading || assigning}
            >
              <option value="">Select client...</option>

              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              assigning ||
              !selectedAnalystId ||
              !selectedClientId ||
              assignmentExists
            }
          >
            {assigning ? "Assigning..." : "Assign Analyst"}
          </button>
        </form>

        {assignmentExists && (
          <p className="client-management-hint">
            This analyst is already assigned to the
            selected client.
          </p>
        )}
      </div>

      {/* REGISTERED CLIENTS */}
      <div className="client-management-section">
        <h3>Registered Clients</h3>

        {loading ? (
          <p className="client-management-empty">
            Loading clients...
          </p>
        ) : clients.length === 0 ? (
          <p className="client-management-empty">
            No registered clients found.
          </p>
        ) : (
          <div className="client-management-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Assigned Analysts</th>
                </tr>
              </thead>

              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.name}</td>

                    <td>
                      <span
                        className={`client-status ${
                          client.is_active
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {client.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td>
                      {
                        assignments.filter(
                          (assignment) =>
                            String(assignment.client_id) ===
                            String(client.id)
                        ).length
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ANALYST ASSIGNMENTS */}
      <div className="client-management-section">
        <h3>Analyst Assignments</h3>

        {loading ? (
          <p className="client-management-empty">
            Loading analyst assignments...
          </p>
        ) : assignments.length === 0 ? (
          <p className="client-management-empty">
            No analyst assignments found.
          </p>
        ) : (
          <div className="client-management-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Analyst</th>
                  <th>Client</th>
                  <th>Assigned At</th>
                </tr>
              </thead>

              <tbody>
                {assignments.map((assignment) => (
                  <tr
                    key={`${assignment.user_id}-${assignment.client_id}`}
                  >
                    <td>{assignment.analyst_email}</td>
                    <td>{assignment.client_name}</td>
                    <td>
                      {assignment.assigned_at ||
                        "Not available"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientManagement;
