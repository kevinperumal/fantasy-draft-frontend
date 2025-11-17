import { useEffect, useState } from "react";
import "./App.css";

// VITE_BACKEND_URL should point to your backend (ngrok URL),
// e.g. https://0a2bbb89b36a.ngrok-free.app
const API_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [sport, setSport] = useState("baseball");
  const [leagueId, setLeagueId] = useState("");
  const [sheetUrl, setSheetUrl] = useState(
    "https://docs.google.com/spreadsheets/d/1xOTF5J065gABOOVm930ANNcq0kGooZ6Ua7GdrY6b5sc/edit?usp=sharing"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runStatus, setRunStatus] = useState(null);
  const [health, setHealth] = useState("unknown"); // "unknown" | "ok" | "down"

  // Poll backend /health so we know things are up
  useEffect(() => {
    if (!API_URL) {
      setHealth("down");
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
        if (!cancelled) {
          setHealth(res.ok ? "ok" : "down");
        }
      } catch {
        if (!cancelled) setHealth("down");
      }
    }

    poll();
    const id = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!API_URL) {
      setRunStatus("Backend URL (VITE_BACKEND_URL) is not set.");
      return;
    }

    if (!leagueId.trim()) {
      setRunStatus("Please enter a league ID.");
      return;
    }

    setIsSubmitting(true);
    setRunStatus(null);

    try {
      const res = await fetch(`${API_URL}/worker/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueId: leagueId.trim(),
          sport,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setRunStatus(
          `Started automation: league=${data.leagueId || leagueId.trim()}, sport=${
            data.sport || sport
          }`
        );
      } else {
        setRunStatus(`Error from backend: ${data.error || res.statusText}`);
      }
    } catch (err) {
      setRunStatus(`Request failed: ${err?.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Just use whatever URL the user gives us – ideally the /edit URL
  const sheetEmbedUrl = sheetUrl || "";

  const healthLabel =
    health === "ok" ? "Online" : health === "down" ? "Offline" : "Checking…";
  const healthColor =
    health === "ok" ? "green" : health === "down" ? "red" : "gray";

  return (
    <div
      className="App"
      style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem" }}
    >
      <h1>Fantasy Draft Tracker</h1>
      <p style={{ color: "#555", marginBottom: "0.75rem" }}>
        Fill in your league info and start the worker. It will open the ESPN
        draft room and begin tracking picks.
      </p>

      <p style={{ marginBottom: "1.25rem" }}>
        Backend status:{" "}
        <strong style={{ color: healthColor }}>{healthLabel}</strong>
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: "1.5rem" }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>
            <div>Sport</div>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              style={{ width: "100%", maxWidth: 240 }}
            >
              <option value="baseball">Baseball</option>
              <option value="football">Football</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label>
            <div>League ID</div>
            <input
              type="text"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              style={{ width: "100%", maxWidth: 240 }}
              placeholder="e.g. 123456"
            />
          </label>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label>
            <div>Google Sheet URL</div>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              style={{ width: "100%" }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </label>
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Starting…" : "Start Draft Automation"}
        </button>
      </form>

      {runStatus && (
        <p style={{ marginBottom: "1.5rem" }}>
          <strong>{runStatus}</strong>
        </p>
      )}

      <section>
        <h2>Draft Sheet</h2>
        {sheetEmbedUrl ? (
          <iframe
            title="Draft Sheet"
            src={sheetEmbedUrl}
            style={{
              width: "100%",
              height: "70vh",
              border: "1px solid #ccc",
            }}
          />
        ) : (
          <p style={{ color: "#777" }}>
            Paste a Google Sheet URL to see it here.
          </p>
        )}
      </section>
    </div>
  );
}

export default App;

