function AdminDashboard() {
  return (
    <div>
      <h2>Administration Overview</h2>
      <p>
        Manage ThreatLens users, client organizations, and
        system integrations.
      </p>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>User Management</h3>
          <p>Manage ThreatLens user accounts and roles.</p>
        </div>

        <div className="stat-card">
          <h3>Client Management</h3>
          <p>Manage client organizations and analyst assignments.</p>
        </div>

        <div className="stat-card">
          <h3>Integrations</h3>
          <p>View and manage system integrations.</p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
