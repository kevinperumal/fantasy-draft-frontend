import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const PHASE_LABELS = {
  starting: "Starting…",
  logging_in: "Logging in",
  waiting_room: "In waiting room",
  draft_live: "Draft live",
  completed: "Completed",
  error: "Error",
};

const STATUS_COLORS = {
  queued: "#888",
  running: "#2563eb",
  succeeded: "#16a34a",
  failed: "#dc2626",
  canceled: "#888",
};

function authHeaders() {
  const token = sessionStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function StatusBadge({ status, phase }) {
  const color = STATUS_COLORS[status] || "#888";
  const label = status === "running" && phase
    ? `${PHASE_LABELS[phase] || phase}`
    : status;
  return (
    <span style={{ color, fontWeight: 600, textTransform: "capitalize" }}>
      {label}
    </span>
  );
}

function ActiveDraftPanel({ draft, job, onCancel }) {
  const isTerminal =
    !job || ["succeeded", "failed", "canceled"].includes(job.status);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Active Draft</h2>
        {!isTerminal && (
          <button
            onClick={onCancel}
            style={{ fontSize: "0.85rem", color: "#dc2626", background: "none", border: "1px solid #dc2626", borderRadius: 4, padding: "0.25rem 0.6rem", cursor: "pointer" }}
          >
            Cancel
          </button>
        )}
      </div>

      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.4rem 1rem", margin: 0 }}>
        <dt style={{ color: "#555" }}>League</dt>
        <dd style={{ margin: 0 }}>{draft.leagueId}</dd>

        <dt style={{ color: "#555" }}>Sport</dt>
        <dd style={{ margin: 0, textTransform: "capitalize" }}>{draft.sport}</dd>

        <dt style={{ color: "#555" }}>Sheet</dt>
        <dd style={{ margin: 0 }}>
          {draft.sheetUrl
            ? <a href={draft.sheetUrl} target="_blank" rel="noreferrer">Open sheet</a>
            : <span style={{ color: "#888" }}>Not provisioned</span>}
        </dd>

        <dt style={{ color: "#555" }}>Status</dt>
        <dd style={{ margin: 0 }}>
          {job
            ? <StatusBadge status={job.status} phase={job.phase} />
            : <span style={{ color: "#888" }}>No job</span>}
        </dd>
      </dl>

      {draft.sheetUrl && (
        <iframe
          title="Draft Sheet"
          src={draft.sheetUrl}
          style={{ width: "100%", height: "75vh", minHeight: 400, border: "1px solid #ccc", marginTop: "1.25rem", borderRadius: 4, display: "block" }}
        />
      )}
    </div>
  );
}

function NewDraftForm({ onCreated }) {
  const [leagueId, setLeagueId] = useState("");
  const [sport, setSport] = useState("baseball");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!leagueId.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ leagueId: leagueId.trim(), sport }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onCreated(data);
      } else {
        setError(data.message || "Failed to create draft");
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem" }}>
      <h2 style={{ marginTop: 0 }}>New Draft</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>
            <div style={{ marginBottom: "0.25rem" }}>Sport</div>
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

        <div style={{ marginBottom: "1rem" }}>
          <label>
            <div style={{ marginBottom: "0.25rem" }}>League ID</div>
            <input
              type="text"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              style={{ width: "100%", maxWidth: 240 }}
              placeholder="e.g. 123456"
              required
            />
          </label>
        </div>

        {error && <p style={{ color: "red", marginBottom: "0.75rem" }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Start Draft"}
        </button>
      </form>
    </div>
  );
}

export default function Dashboard({ username, onLogout }) {
  const [activeDraft, setActiveDraft] = useState(undefined); // undefined = not fetched yet
  const [loadError, setLoadError] = useState(null);

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/drafts/active`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const text = await res.text();
      setActiveDraft(text.length ? JSON.parse(text) : null);
      setLoadError(null);
    } catch {
      setLoadError("Could not load draft status");
    }
  }, []);

  // Initial load
  useEffect(() => { fetchActive(); }, [fetchActive]);

  // Poll while a draft is active and the job is not terminal
  useEffect(() => {
    if (!activeDraft?.job) return;
    const { status } = activeDraft.job;
    if (["succeeded", "failed", "canceled"].includes(status)) return;

    const id = setInterval(fetchActive, 5000);
    return () => clearInterval(id);
  }, [activeDraft, fetchActive]);

  async function handleCancel() {
    if (!activeDraft?.draft) return;
    await fetch(`${API_URL}/drafts/${activeDraft.draft.id}/cancel`, {
      method: "POST",
      headers: authHeaders(),
    });
    fetchActive();
  }

  async function handleLogout() {
    await fetch(`${API_URL}/auth/logout`, { method: "POST", headers: authHeaders() });
    sessionStorage.removeItem("auth_token");
    onLogout();
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1rem 1.25rem", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, whiteSpace: "nowrap" }}>DraftPilot</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          <span style={{ color: "#555", fontSize: "0.9rem" }}>{username}</span>
          <button onClick={handleLogout} style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>Sign out</button>
        </div>
      </div>

      {loadError && (
        <p style={{ color: "red" }}>{loadError}</p>
      )}

      {activeDraft === undefined && !loadError && (
        <p style={{ color: "#888" }}>Loading…</p>
      )}

      {activeDraft === null && (
        <NewDraftForm onCreated={() => fetchActive()} />
      )}

      {activeDraft?.draft && (
        <ActiveDraftPanel
          draft={activeDraft.draft}
          job={activeDraft.job}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
