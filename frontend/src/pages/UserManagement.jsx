
import { useEffect, useState } from "react";
import {
  getAdminUsers,
  updateUserStatus,
} from "../services/adminUsers";

import "./UserManagement.css";

function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingChange, setPendingChange] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      try {
        const data = await getAdminUsers(controller.signal);

        if (!controller.signal.aborted) {
          setUsers(data.users || []);
        }
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

    loadUsers();
    return () => controller.abort();
  }, []);

  function requestStatusChange(user) {
    if (savingUserId !== null) return;

    const isSelf =
      String(user.id) === String(currentUser?.id);

    if (isSelf && user.is_active) return;

    setError("");
    setMessage("");
    setPendingChange({
      id: user.id,
      email: user.email,
      nextActive: !Boolean(user.is_active),
    });
  }

  async function confirmStatusChange() {
    if (!pendingChange || savingUserId !== null) return;

    const change = pendingChange;
    setSavingUserId(change.id);
    setError("");
    setMessage("");

    try {
      await updateUserStatus(change.id, change.nextActive);

      // Reload authoritative data from the backend.
      const data = await getAdminUsers();
      setUsers(data.users || []);

      setMessage(
        change.nextActive
          ? "User activated successfully."
          : "User deactivated successfully."
      );
      setPendingChange(null);
    } catch (err) {
      setError(
        `${err.message} If the request may have succeeded, refresh the page before retrying.`
      );
      setPendingChange(null);
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="user-management">
      <h2>User Management</h2>
      <p>
        View registered ThreatLens accounts and manage
        account access.
      </p>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <div className="user-management-section">
        <div className="user-management-header">
          <h3>Registered Users</h3>
          <span>
            {loading ? "Loading..." : `${users.length} accounts`}
          </span>
        </div>

        {loading ? (
          <p className="user-management-empty">
            Loading user accounts...
          </p>
        ) : error && users.length === 0 ? null : users.length === 0 ? (
          <p className="user-management-empty">
            No registered users found.
          </p>
        ) : (
          <div className="user-management-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const isActive = Boolean(user.is_active);
                  const isSelf =
                    String(user.id) === String(currentUser?.id);
                  const isSaving = savingUserId === user.id;

                  return (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.email}</td>

                      <td>
                        <span
                          className={`user-role-badge ${
                            user.role === "admin"
                              ? "admin"
                              : "analyst"
                          }`}
                        >
                          {user.role === "admin"
                            ? "Administrator"
                            : "Analyst"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`user-status-badge ${
                            isActive ? "active" : "inactive"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        {user.created_at || "Not available"}
                      </td>

                      <td>
                        {isSelf && isActive ? (
                          <span className="user-management-protected">
                            Your account — Protected
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={`user-management-action ${
                              isActive ? "deactivate" : "activate"
                            }`}
                            onClick={() => requestStatusChange(user)}
                            disabled={savingUserId !== null}
                          >
                            {isSaving
                              ? "Saving..."
                              : isActive
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pendingChange && (
        <div className="user-management-confirmation" role="dialog"
          aria-modal="true"
          aria-labelledby="user-status-confirm-title"
        >
          <div className="user-management-confirmation-card">
            <h3 id="user-status-confirm-title">
              {pendingChange.nextActive
                ? "Activate User"
                : "Deactivate User"}
            </h3>

            <p>
              {pendingChange.nextActive
                ? "Reactivate access for "
                : "Revoke access for "}
              <strong>{pendingChange.email}</strong>?
            </p>

            {!pendingChange.nextActive && (
              <p>
                This user will lose access to ThreatLens,
                including any existing authenticated sessions.
                Their account and investigation history will
                remain in the database.
              </p>
            )}

            <div className="user-management-confirmation-actions">
              <button
                type="button"
                className="user-management-cancel"
                onClick={() => setPendingChange(null)}
                disabled={savingUserId !== null}
              >
                Cancel
              </button>

              <button
                type="button"
                className={`user-management-action ${
                  pendingChange.nextActive
                    ? "activate"
                    : "deactivate"
                }`}
                onClick={confirmStatusChange}
                disabled={savingUserId !== null}
              >
                {savingUserId !== null
                  ? "Saving..."
                  : pendingChange.nextActive
                    ? "Confirm Activation"
                    : "Confirm Deactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
