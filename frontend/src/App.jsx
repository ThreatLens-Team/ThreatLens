
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import EventTable from "./components/EventTable";
import "./App.css";

function App() {
  const [apiStatus, setApiStatus] = useState("Checking...");

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

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <header className="top-header">
          <h2>Security Overview</h2>
          <span>Backend: {apiStatus}</span>
        </header>

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

          <EventTable />
        </section>
      </main>
    </div>
  );
}

export default App;

