
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import EventTable from "./components/EventTable";
import Investigations from "./pages/Investigations";
import Login from "./pages/Login";

import {
  getCurrentUser,
  logout,
} from "./services/auth";

import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [apiStatus, setApiStatus] = useState("Checking...");
  const [currentPage, setCurrentPage] = useState("overview");
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Check whether an authenticated session already exists.
  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (active) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setAuthLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Keep the existing backend health check.
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Backend health check failed");
        }

        return response.json();
      })
      .then((data) => setApiStatus(data.status))
      .catch(() => setApiStatus("offline"));
  }, []);

  const handleLogin = (authenticatedUser) => {
    setUser(authenticatedUser);
    setAuthError("");
    setCurrentPage("overview");
    setSelectedEvent(null);
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setAuthError("");

    try {
      await logout();

      setUser(null);
      setCurrentPage("overview");
      setSelectedEvent(null);
    } catch {
      setAuthError(
        "Unable to confirm logout. Please try again."
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleInvestigate = (event) => {
    setSelectedEvent(event);
    setCurrentPage("investigations");
  };

  const handleBack = () => {
    setCurrentPage("overview");
  };

  const handleNavigate = (page) => {
    if (page === "overview" || page === "investigations") {
      setCurrentPage(page);
    }
  };

  // Wait until FastAPI finishes checking the session.
  if (authLoading) {
    return (
      <div className="auth-loading">
        <h2>ThreatLens</h2>
        <p>Checking your session...</p>
      </div>
    );
  }

  // No authenticated session: show the login page.
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
      />

      <main className="main-content">
        <header className="top-header">
          <h2>
            {currentPage === "overview"
              ? "Security Overview"
              : "Security Investigations"}
          </h2>

          <span>Backend: {apiStatus}</span>
        </header>

        {authError && (
          <p className="auth-error" role="alert">
            {authError}
          </p>
        )}

        {currentPage === "overview" ? (
          <section className="dashboard-content">
            <h3>IAM Activity Overview</h3>

            <p>
              Monitor authentication and authorization activity
              across connected systems.
            </p>

            <div className="stats-grid">
              <StatCard
                title="Total IAM Events"
                value="102"
                subtitle="Last 24 hours"
              />

              <StatCard
                title="Suspicious Events"
                value="17"
                subtitle="5 high risk — prioritize now"
                variant="danger"
              />

              <StatCard
                title="Active Investigations"
                value="3"
                subtitle="1 awaiting review"
              />
            </div>

            <p className="demo-note">
              Dashboard metrics are demonstration data.
            </p>

            <EventTable onInvestigate={handleInvestigate} />
          </section>
        ) : (
          <Investigations
            event={selectedEvent}
            onBack={handleBack}
          />
        )}
      </main>
    </div>
  );
}

export default App;
