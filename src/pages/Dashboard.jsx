import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function Dashboard({ username, onLogout }) {
  const [sport, setSport] = useState("baseball");
  const [leagueId, setLeagueId] = useState("");
  const [sheetUrl, setSheetUrl] = useState(
    "https://docs.google.com/spreadsheets/d/1xOTF5J065gABOOVm930ANNcq0kGooZ6Ua7GdrY6b5sc/edit?usp=sharing"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runStatus, setRunStatus] = useState(null);
  const [health, setHealth] = useState("unknown");

  useEffect(() => {
    if (!API_URL) {
      setHealth("down");
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
        if (!cancelled) setHealth(res.ok ? "ok" : "down");
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
        credentials: "include",
        body: JSON.stringify({ leagueId: leagueId.trim(), sport }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setRunStatus(
          `Started: league=${data.leagueId || leagueId.trim()}, sport=${data.sport || sport}`
        );
      } else {
        setRunStatus(`Error: ${data.error || res.statusText}`);
      }
    } catch (err) {
      setRunStatus(`Request failed: ${err?.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    onLogout();
  }

  const healthLabel =
    health === "ok" ? "Online" : health === "down" ? "Offline" : "Checking…";
  const healthColor =
    health === "ok" ? "green" : health === "down" ? "red" : "gray";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>Fantasy Draft Tracker</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "#555" }}>{username}</span>
          <button onClick={handleLogout} style={{ fontSize: "0.85rem" }}>
            Sign out
          </button>
        </div>
      </div>

      <p style={{ color: "#555", marginBottom: "0.75rem" }}>
        Fill in your league info and start the worker.
      </p>

      <p style={{ marginBottom: "1.25rem" }}>
        Backend:{" "}
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
        {sheetUrl ? (
          <iframe
            title="Draft Sheet"
            src={sheetUrl}
            style={{ width: "100%", height: "70vh", border: "1px solid #ccc" }}
          />
        ) : (
          <p style={{ color: "#777" }}>Paste a Google Sheet URL to see it here.</p>
        )}
      </section>
    </div>
  );
}
