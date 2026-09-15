import { useEffect, useState } from "react";

function App() {
  const [apiStatus, setApiStatus] = useState("Checking...");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/health`)
      .then((response) => response.json())
      .then((data) => setApiStatus(data.status))
      .catch(() => setApiStatus("offline"));
  }, []);

  return (
    <div>
      <h1>ThreatLens</h1>
      <p>ThreatLens Development Environment</p>

      <h2>Backend Status</h2>
      <p>{apiStatus}</p>
    </div>
  );
}

export default App;
