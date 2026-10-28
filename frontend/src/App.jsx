import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import EventTable from "./components/EventTable";
import Investigations from "./pages/Investigations";
import Login from "./pages/Login";
import "./App.css";

function App() {
  const [apiStatus, setApiStatus] = useState("Checking...");
  const [currentPage, setCurrentPage] = useState("overview");
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Temporary UI preview mode.
  // Real authentication will be implemented in Commit 4.
  const [showLoginPreview, setShowLoginPreview] = useState(true);

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

  // Show the login UI without pretending to authenticate.
  if (showLoginPreview) {
    return (
      <>
        <Login />

        <button
          type="button"
          onClick={() => setShowLoginPreview(false)}
          style={{
            position: "fixed",
            bottom: "16px",
            right: "16px",
            padding: "10px 14px",
            background: "#303030",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Preview Dashboard (Development Only)
        </button>
      </>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
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



