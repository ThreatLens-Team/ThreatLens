

import { useEffect, useState } from "react";

import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import EventTable from "./components/EventTable";
import Investigations from "./pages/Investigations";
import Login from "./pages/Login";

import { getCurrentUser, logout } from "./services/auth";
import { getClients, getClientEvents } from "./services/clients";

import "./App.css";

// Convert API event fields to the format used by
// our existing ThreatLens EventTable component.
function normalizeEvent(event, clientId) {
  const severity =
    event.risk_level === "high"
      ? "High"
      : event.risk_level === "medium"
        ? "Medium"
        : "Low";

  return {
    id: event.id,
    clientId,
    timestamp: event.timestamp || "Not available",
    eventType: event.event_type || "UNKNOWN",
    username: event.username || "Unknown",
    sourceIP: event.source_ip || "Not available",
    severity,
    status: event.status || "Not provided",
    description: event.description || "",
  };
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [apiStatus, setApiStatus] = useState("Checking...");
  const [currentPage, setCurrentPage] = useState("overview");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState("");

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [eventSource, setEventSource] = useState("");

  // Restore an existing authenticated session.
  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Preserve the backend health check.
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

  // Load only the clients authorized for this user.
  useEffect(() => {
    if (!user) {
      setClients([]);
      setSelectedClientId("");
      setClientsError("");
      return;
    }

    const controller = new AbortController();

    setClientsLoading(true);
    setClientsError("");
    setClients([]);
    setSelectedClientId("");

    getClients(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;

        const availableClients = data.clients || [];
        setClients(availableClients);

        if (availableClients.length > 0) {
          setSelectedClientId(String(availableClients[0].id));
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        setClientsError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setClientsLoading(false);
        }
      });

    return () => controller.abort();
  }, [user]);

  // Request events for the selected client.
  // Abort old requests when the selected client changes.
  useEffect(() => {
    setEvents([]);
    setEventsError("");
    setEventSource("");

    if (!user || !selectedClientId) {
      setEventsLoading(false);
      return;
    }

    const controller = new AbortController();

    setEventsLoading(true);

    getClientEvents(selectedClientId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;

        setEvents(
          (data.events || []).map((event) =>
            normalizeEvent(event, Number(selectedClientId))
          )
        );

        setEventSource(data.source || "unknown");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        setEventsError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setEventsLoading(false);
        }
      });

    return () => controller.abort();
  }, [user, selectedClientId]);

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
      setClients([]);
      setSelectedClientId("");
      setEvents([]);
      setSelectedEvent(null);
      setCurrentPage("overview");
    } catch {
      setAuthError(
        "Unable to confirm logout. Please try again."
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleClientChange = (event) => {
    setSelectedClientId(event.target.value);
    setSelectedEvent(null);
    setCurrentPage("overview");
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

  const selectedClient = clients.find(
    (client) => String(client.id) === selectedClientId
  );

  const suspiciousCount = events.filter(
    (event) =>
      event.severity === "High" ||
      event.severity === "Medium"
  ).length;

  if (authLoading) {
    return (
      <div className="auth-loading">
        <h2>ThreatLens</h2>
        <p>Checking your session...</p>
      </div>
    );
  }

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

        <section className="dashboard-content">
          <div className="client-toolbar">
            <div>
              <label htmlFor="client-selector">
                Client Workspace
              </label>
              <p>
                Choose a company you are authorized to investigate.
              </p>
            </div>

            <select
              id="client-selector"
              className="client-select"
              value={selectedClientId}
              onChange={handleClientChange}
              disabled={clientsLoading || clients.length === 0}
            >
              {clients.length === 0 && (
                <option value="">
                  {clientsLoading
                    ? "Loading clients..."
                    : "No clients available"}
                </option>
              )}

              {clients.map((client) => (
                <option key={client.id} value={String(client.id)}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {clientsError && (
            <p className="client-message" role="alert">
              Unable to load clients: {clientsError}
            </p>
          )}

          {!clientsLoading &&
            !clientsError &&
            clients.length === 0 && (
              <p className="client-message">
                No client workspaces are assigned to your account.
              </p>
            )}

          {currentPage === "overview" ? (
            <>
              <h3>IAM Activity Overview</h3>
              <p>
                {selectedClient
                  ? `Security activity for ${selectedClient.name}.`
                  : "Select a client workspace to view its activity."}
              </p>

              {eventsLoading && (
                <p className="client-message" role="status">
                  Loading client security events...
                </p>
              )}

              {eventsError && (
                <p className="client-message" role="alert">
                  {eventsError}
                </p>
              )}

              {selectedClient &&
                !eventsLoading &&
                !eventsError && (
                  <>
                    <div className="stats-grid">
                      <StatCard
                        title="Total IAM Events"
                        value={String(events.length)}
                        subtitle="Events returned by this client API"
                      />

                      <StatCard
                        title="Elevated Risk Events"
                        value={String(suspiciousCount)}
                        subtitle="High and medium risk events"
                        variant="danger"
                      />

                      <StatCard
                        title="Active Investigations"
                        value="N/A"
                        subtitle="Investigation tracking not connected"
                      />
                    </div>

                    <p className="demo-note">
                      {eventSource === "demo"
                        ? "Demonstration data — not live security evidence."
                        : "Event source: " + eventSource}
                    </p>

                    <EventTable
                      key={selectedClientId}
                      events={events}
                      onInvestigate={handleInvestigate}
                      source={eventSource}
                    />
                  </>
                )}
            </>
          ) : (
            <Investigations
              event={selectedEvent}
              onBack={handleBack}
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;

