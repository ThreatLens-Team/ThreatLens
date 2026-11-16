import { useEffect, useState } from "react";
import { getAdminUsers } from "../services/adminUsers";
import "./UserManagement.css";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <div className="user-management">
      <h2>User Management</h2>
      <p>
        View registered ThreatLens accounts and their
        access permissions.
      </p>

      <div className="user-management-section">
        <div className="user-management-header">
          <h3>Registered Users</h3>
          <span>
            {loading ? "Loading..." : `${users.length} accounts`}
          </span>
        </div>

        {error && <p role="alert">{error}</p>}

        {loading ? (
          <p className="user-management-empty">
            Loading user accounts...
          </p>
        ) : error ? null : users.length === 0 ? (
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
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
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
                          user.is_active
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {user.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td>{user.created_at || "Not available"}</td>
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

export default UserManagement;
