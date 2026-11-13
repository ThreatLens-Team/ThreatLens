import { useEffect, useRef, useState } from "react";

import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import EventTable from "./components/EventTable";
import Investigations from "./pages/Investigations";
import InvestigationList from "./pages/InvestigationList";
import Login from "./pages/Login";

import { getCurrentUser, logout } from "./services/auth";
import { getClients, getClientEvents } from "./services/clients";
import { getClientCases, openClientCase } from "./services/cases";

import "./App.css";

// Keep the event shape expected by EventTable and Investigations.
// Unknown risk must not be mislabeled as Low.
function normalizeEvent(event, clientId) {
  const risk = String(
    event.risk_level || "unknown"
  ).toLowerCase();

  const severity =
    risk === "high"
      ? "High"
      : risk === "medium"
        ? "Medium"
        : risk === "low"
          ? "Low"
          : "Unknown";
  return {
    id: event.id,
    clientId,
    timestamp: event.timestamp || "Not available",
    eventType: event.event_type || "UNKNOWN",
    username: event.username || "Unknown",
    sourceIP: event.source_ip || "Not available",
    severity,
    // This is the original event outcome (e.g. FAILURE), not case workflow status.
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
  const [selectedCase, setSelectedCase] = useState(null);

  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState("");

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [eventSource, setEventSource] = useState("");

  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState("");
  const [openingCase, setOpeningCase] = useState(false);
  const [caseActionError, setCaseActionError] = useState("");

  // Prevent a delayed case request from opening under a different workspace.
  const activeClientRef = useRef("");

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

  // Preserve the existing backend health check.
  useEffect(() => {
    const controller = new AbortController();

    fetch(`${import.meta.env.VITE_API_URL}/api/health`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Backend health check failed");
        return response.json();
      })
      .then((data) => setApiStatus(data.status))
      .catch(() => {
        if (!controller.signal.aborted) setApiStatus("offline");
      });

    return () => controller.abort();
  }, []);

  // Load only the client workspaces this user is authorized to access.
  useEffect(() => {
    if (!user) {
      setClients([]);
      setSelectedClientId("");
      activeClientRef.current = "";
      setClientsError("");
      return;
    }

    const controller = new AbortController();
    setClientsLoading(true);
    setClientsError("");
    setClients([]);
    setSelectedClientId("");
    activeClientRef.current = "";

    getClients(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;

        const availableClients = data.clients || [];
        setClients(availableClients);

        if (availableClients.length > 0) {
          const firstId = String(availableClients[0].id);
          activeClientRef.current = firstId;
          setSelectedClientId(firstId);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setClientsError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setClientsLoading(false);
      });

    return () => controller.abort();
  }, [user]);

  // Load IAM events for the selected client, preserving Splunk authorization.
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
        if (!controller.signal.aborted) setEventsError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setEventsLoading(false);
      });

    return () => controller.abort();
  }, [user, selectedClientId]);

  // Shared cases appear for every authorized analyst in the client workspace.
  // Poll only the case list; never regenerate AI output during this refresh.
  useEffect(() => {
    setCases([]);
    setCasesError("");

    if (!user || !selectedClientId) {
      setCasesLoading(false);
      return;
    }

    const controller = new AbortController();
    let requesting = false;
    setCasesLoading(true);

    async function refreshCases() {
      if (requesting || controller.signal.aborted) return;
      requesting = true;

      try {
        const data = await getClientCases(selectedClientId, controller.signal);
        if (!controller.signal.aborted) {
          setCases(data.cases || []);
          setCasesError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) setCasesError(error.message);
      } finally {
        requesting = false;
        if (!controller.signal.aborted) setCasesLoading(false);
      }
    }

    refreshCases();
    const intervalId = setInterval(refreshCases, 15000);

    return () => {
      clearInterval(intervalId);
      controller.abort();
    };
  }, [user, selectedClientId]);

  const handleLogin = (authenticatedUser) => {
    setUser(authenticatedUser);
    setAuthError("");
    setCurrentPage("overview");
    setSelectedEvent(null);
    setSelectedCase(null);
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setAuthError("");

    try {
      await logout();
      activeClientRef.current = "";
      setUser(null);
      setClients([]);
      setSelectedClientId("");
      setEvents([]);
      setCases([]);
      setSelectedEvent(null);
      setSelectedCase(null);
      setCurrentPage("overview");
    } catch {
      setAuthError("Unable to confirm logout. Please try again.");
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleClientChange = (event) => {
    const nextId = event.target.value;
    activeClientRef.current = nextId;
    setSelectedClientId(nextId);
    setSelectedEvent(null);
    setSelectedCase(null);
    setCaseActionError("");
    setCurrentPage("overview");
  };

  // Open a saved case in the existing investigation details component.
  const handleOpenCase = (caseRecord) => {
    if (String(caseRecord.client_id) !== activeClientRef.current) return;

    setCases((current) => [
      caseRecord,
      ...current.filter((item) => item.id !== caseRecord.id),
    ]);

    setSelectedCase(caseRecord);
    setSelectedEvent(
      normalizeEvent(caseRecord.event, Number(caseRecord.client_id))
    );
    setCurrentPage("investigations");
  };

  // Overview's Investigate action now CREATES or retrieves a database case.
  const handleInvestigate = async (event) => {
    const clientId = String(selectedClientId);
    if (!clientId || openingCase || String(event.clientId) !== clientId) return;

    setOpeningCase(true);
    setCaseActionError("");

    try {
      const result = await openClientCase(clientId, event.id);
      if (activeClientRef.current === clientId) {
        handleOpenCase(result.case);
      }
    } catch (error) {
      if (activeClientRef.current === clientId) {
        setCaseActionError(error.message);
      }
    } finally {
      setOpeningCase(false);
    }
  };

  const handleBack = () => {
    setSelectedEvent(null);
    setSelectedCase(null);
    setCurrentPage("investigations");
  };

  const handleNavigate = (page) => {
    if (page === "overview" || page === "investigations") {
      setSelectedEvent(null);
      setSelectedCase(null);
      setCurrentPage(page);
    }
  };

  const selectedClient = clients.find(
    (client) => String(client.id) === selectedClientId
  );

  const visibleCases = cases.filter(
    (item) => String(item.client_id) === selectedClientId
  );

  const activeInvestigationsCount = visibleCases.filter(
    (item) => item.status === "investigating" || item.status === "review"
  ).length;

  // Suspicious Events: High-risk classifications ONLY.
  const suspiciousCount = events.filter(
    (event) => event.severity === "High"
  ).length;
  // Workflow status is separate from the event's original SUCCESS/FAILURE.
  const overviewEvents = events.map((event) => {
    const caseRecord = visibleCases.find((item) => item.event_id === event.id);

    let workflowStatus = "Open";
    if (casesLoading) workflowStatus = "Loading...";
    else if (casesError) workflowStatus = "Unavailable";
    else if (caseRecord?.status === "verified") workflowStatus = "Verified";
    else if (caseRecord?.status === "review") workflowStatus = "Review";
    else if (caseRecord) workflowStatus = "Pending";

    return { ...event, status: workflowStatus };
  });

  if (authLoading) {
    return (
      <div className="auth-loading">
        <h2>ThreatLens</h2>
        <p>Checking your session...</p>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-layout">
      <Sidebar
        user={user}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
      />

      <main className="main-content" style={{ minWidth: 0, flex: 1 }}>
        <header
          className="topbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 24px",
            borderBottom: "1px solid #303030",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            {currentPage === "overview"
              ? "Security Overview"
              : "Security Investigations"}
          </h2>
        </header>

        <section className="dashboard-content" style={{ padding: 24 }}>
          {authError && (
            <p className="client-message" role="alert">
              {authError}
            </p>
          )}

          <div
            className="client-workspace"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
              padding: "16px 18px",
              marginBottom: 24,
              background: "#1b1b1b",
              border: "1px solid #383838",
              borderRadius: 8,
            }}
          >
            <div>
              <strong style={{ color: "#f3f3f3" }}>Client </strong>
            </div>
            <select
              value={selectedClientId}
              onChange={handleClientChange}
              disabled={clientsLoading || clients.length === 0}
              aria-label="Client workspace"
              style={{
                minWidth: 170,
                padding: "9px 12px",
                borderRadius: 6,
                border: "1px solid #555",
                background: "#292929",
                color: "#f4f4f4",
              }}
            >
              {clients.length === 0 && <option value="">No clients available</option>}
              {clients.map((client) => (
                <option key={client.id} value={String(client.id)}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {clientsLoading && (
            <p className="client-message" role="status">
              Loading client workspaces...
            </p>
          )}
          {clientsError && (
            <p className="client-message" role="alert">
              Unable to load clients: {clientsError}
            </p>
          )}
          {!clientsLoading && !clientsError && clients.length === 0 && (
            <p className="client-message">
              No client workspaces are assigned to your account.
            </p>
          )}

          {currentPage === "overview" ? (
            <>
	      <h2 className="tl-overview-section-title">
                IAM Activity Overview
              </h2>
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

              {selectedClient && !eventsLoading && !eventsError && (
                <>
                  <div className="stats-grid">
                    <StatCard
                      title="Total IAM Events"
                      value={String(events.length)}
                      subtitle="Events returned by this client API"
                    />
                    <StatCard
		      title="Suspicious Events"
                      value={String(suspiciousCount)}
                      subtitle="High-risk security events"
                      variant="danger"
                    />
                    <StatCard
                      title="Active Investigations"
                      value={
                        casesLoading || casesError
                          ? "—"
                          : String(activeInvestigationsCount)
                      }
                      subtitle="Investigating or awaiting review"
                    />
                  </div>

                  <p className="demo-note">
                    {eventSource === "demo"
                      ? "Demonstration data — not live security evidence."
                      : `Event source: ${eventSource}`}
                  </p>

                  {openingCase && (
                    <p role="status">Opening investigation...</p>
                  )}
                  {caseActionError && (
                    <p className="client-message" role="alert">
                      Unable to open investigation: {caseActionError}
                    </p>
                  )}
                  {casesError && (
                    <p className="client-message" role="alert">
                      Unable to load investigation statuses: {casesError}
                    </p>
                  )}

                  <EventTable
                    key={selectedClientId}
                    events={overviewEvents}
                    onInvestigate={handleInvestigate}
                    source={eventSource}
                  />
                </>
              )}
            </>
          ) : selectedEvent ? (
            <Investigations
              key={`${selectedClientId}:${selectedEvent.id}`}
              event={selectedEvent}
              events={events}
              caseRecord={selectedCase}
              onBack={() => {
                setSelectedEvent(null);
                setSelectedCase(null);
                setCurrentPage("investigations");
              }}
            />
          ) : (
            <InvestigationList
              key={selectedClientId}
              clientId={selectedClientId}
              clientName={selectedClient?.name}
              events={events}
              onOpenCase={handleOpenCase}
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
