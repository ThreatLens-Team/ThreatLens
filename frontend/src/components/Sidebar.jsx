
import "./Sidebar.css";

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">TL</div>
        <h2>ThreatLens</h2>
      </div>

      <div className="sidebar-section">
        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          <button className="nav-item active">
            Overview
          </button>

          <button className="nav-item">
            Security Analytics
          </button>

          <button className="nav-item">
            Investigations
          </button>

          <button className="nav-item">
            Settings
          </button>
        </nav>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">JD</div>
        <div>
          <p className="user-name">Demo Analyst</p>
          <p className="user-role">Security Analyst</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
