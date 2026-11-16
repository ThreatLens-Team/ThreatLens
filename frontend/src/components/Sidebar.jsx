import "./Sidebar.css";
import threatLensLogo from "../assets/threatlens-logo.png";

function Sidebar({
  currentPage,
  onNavigate,
  user,
  onLogout,
  logoutLoading,
}) {
  const userEmail = user?.email || "Unknown user";
  const userRole = user?.role || "analyst";

  const initials = userEmail
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img
          src={threatLensLogo}
          alt="ThreatLens"
          className="sidebar-brand-image"
        />
      </div>


      <div className="sidebar-section">
        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${
              currentPage === "overview" ? "active" : ""
            }`}
            onClick={() => onNavigate("overview")}
          >
            Overview
          </button>

          <button
            type="button"
            className="nav-item"
            disabled
            title="Coming in a future milestone"
          >
            Security Analytics
          </button>

          <button
            type="button"
            className={`nav-item ${
              currentPage === "investigations" ? "active" : ""
            }`}
            onClick={() => onNavigate("investigations")}
          >
            Investigations
          </button>

          <button
            type="button"
            className="nav-item"
            disabled
            title="Coming in a future milestone"
          >
            Settings
          </button>
        </nav>
      </div>
      {userRole === "admin" && (
        <div className="sidebar-section">
          <p className="sidebar-label">ADMINISTRATION</p>

          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-item ${
                currentPage === "admin" ? "active" : ""
              }`}
              onClick={() => onNavigate("admin")}
            >
              Admin Dashboard
            </button>
            <button
              type="button"
              className={`nav-item ${
                currentPage === "client-management" ? "active" : ""
              }`}
              onClick={() => onNavigate("client-management")}
            >
              Client Management
            </button>

            <button
              type="button"
              className={`nav-item ${
                currentPage === "user-management" ? "active" : ""
              }`}
              onClick={() => onNavigate("user-management")}
            >
              User Management
            </button>


          </nav>
        </div>
      )}

      <div className="sidebar-user">
        <div className="user-avatar">
          {initials}
        </div>

        <div className="sidebar-user-info">
          <p className="user-name">{userEmail}</p>
          <p className="user-role">
            {userRole === "admin"
              ? "ThreatLens Administrator"
              : "Security Analyst"}
          </p>
        </div>
      </div>

      <div className="sidebar-logout">
        <button
          type="button"
          className="logout-button"
          onClick={onLogout}
          disabled={logoutLoading}
        >
          {logoutLoading ? "Signing Out..." : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
