import { useCallback, useEffect, useState } from "react";
import RecommendationPanel from "../components/RecommendationPanel";

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

// ─── AI recommendation hook ──────────────────────────────────────────────────

function useRecommendation(aiEnabled, draftPhase) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(async () => {
    if (!aiEnabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/recommendations/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setError(data.error || data.message || "Recommendation failed");
      } else {
        setRecommendation(data);
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }, [aiEnabled]);

  // Clear stale recommendation when AI is toggled off
  useEffect(() => {
    if (!aiEnabled) {
      setRecommendation(null);
      setError(null);
    }
  }, [aiEnabled]);

  // Clear recommendation when draft transitions out of draft_live (stale context)
  useEffect(() => {
    if (draftPhase !== "draft_live") setRecommendation(null);
  }, [draftPhase]);

  return { recommendation, loading, error, generate };
}

// ─── Active draft panel ───────────────────────────────────────────────────────

function ActiveDraftPanel({ draft, job, onCancel, aiEnabled }) {
  const isTerminal =
    !job || ["succeeded", "failed", "canceled"].includes(job.status);
  const isDraftLive = job?.status === "running" && job?.phase === "draft_live";

  const { recommendation, loading, error, generate } = useRecommendation(
    aiEnabled,
    job?.phase,
  );

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

      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.4rem 1rem", margin: "0 0 1rem" }}>
        <dt style={{ color: "#555" }}>League</dt>
        <dd style={{ margin: 0 }}>{draft.leagueId}</dd>

        <dt style={{ color: "#555" }}>Sport</dt>
        <dd style={{ margin: 0, textTransform: "capitalize" }}>{draft.sport}</dd>

        {draft.espnTeamName && (
          <>
            <dt style={{ color: "#555" }}>ESPN Team</dt>
            <dd style={{ margin: 0 }}>{draft.espnTeamName}</dd>
          </>
        )}

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

      {/* AI recommendation panel — only when AI enabled and draft is live */}
      {aiEnabled && isDraftLive && (
        <RecommendationPanel
          recommendation={recommendation}
          loading={loading}
          error={error}
          onGenerate={generate}
        />
      )}

      {aiEnabled && !isDraftLive && !isTerminal && (
        <p style={{ color: "#888", fontSize: "0.85rem", margin: "0 0 1rem" }}>
          AI recommendations will be available once the draft goes live.
        </p>
      )}

      {draft.sheetUrl && (
        <iframe
          title="Draft Sheet"
          src={draft.sheetUrl}
          style={{ width: "100%", height: "75vh", minHeight: 400, border: "1px solid #ccc", marginTop: "0.5rem", borderRadius: 4, display: "block" }}
        />
      )}
    </div>
  );
}

// ─── New draft form ───────────────────────────────────────────────────────────

function NewDraftForm({ onCreated }) {
  const [leagueId, setLeagueId] = useState("");
  const [sport, setSport] = useState("baseball");
  const [espnTeamName, setEspnTeamName] = useState("");
  const [leagueSize, setLeagueSize] = useState(12);
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
        body: JSON.stringify({
          leagueId: leagueId.trim(),
          sport,
          espnTeamName: espnTeamName.trim() || undefined,
          leagueSize: leagueSize || undefined,
        }),
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 1.5rem", maxWidth: 520 }}>
          <label>
            <div style={{ marginBottom: "0.25rem", color: "#555", fontSize: "0.9rem" }}>Sport</div>
            <select value={sport} onChange={(e) => setSport(e.target.value)} style={{ width: "100%" }}>
              <option value="baseball">Baseball</option>
              <option value="football">Football</option>
            </select>
          </label>

          <label>
            <div style={{ marginBottom: "0.25rem", color: "#555", fontSize: "0.9rem" }}>League ID</div>
            <input
              type="text"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              style={{ width: "100%" }}
              placeholder="e.g. 123456"
              required
            />
          </label>

          <label>
            <div style={{ marginBottom: "0.25rem", color: "#555", fontSize: "0.9rem" }}>
              ESPN Team Name <span style={{ color: "#aaa" }}>(for AI recs)</span>
            </div>
            <input
              type="text"
              value={espnTeamName}
              onChange={(e) => setEspnTeamName(e.target.value)}
              style={{ width: "100%" }}
              placeholder="Your ESPN fantasy team"
            />
          </label>

          <label>
            <div style={{ marginBottom: "0.25rem", color: "#555", fontSize: "0.9rem" }}>
              League Size <span style={{ color: "#aaa" }}>(for AI recs)</span>
            </div>
            <input
              type="number"
              value={leagueSize}
              onChange={(e) => setLeagueSize(parseInt(e.target.value) || 12)}
              style={{ width: "100%" }}
              min={4}
              max={20}
            />
          </label>
        </div>

        {error && <p style={{ color: "red", margin: "0.75rem 0" }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ marginTop: "1rem" }}>
          {loading ? "Creating…" : "Start Draft"}
        </button>
      </form>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard({ username, onLogout }) {
  const [activeDraft, setActiveDraft] = useState(undefined);
  const [loadError, setLoadError] = useState(null);

  // AI toggle — persisted in localStorage
  const [aiEnabled, setAiEnabled] = useState(() => {
    try { return localStorage.getItem("draftpilot_ai_enabled") === "true"; }
    catch { return false; }
  });

  function toggleAi(e) {
    const val = e.target.checked;
    setAiEnabled(val);
    try { localStorage.setItem("draftpilot_ai_enabled", String(val)); } catch {}
  }

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

  useEffect(() => { fetchActive(); }, [fetchActive]);

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
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0, flexWrap: "wrap" }}>
          {/* AI toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={toggleAi}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <span style={{ color: aiEnabled ? "#2563eb" : "#888", fontWeight: aiEnabled ? 600 : 400 }}>
              AI Recommendations
            </span>
          </label>
          <span style={{ color: "#555", fontSize: "0.9rem" }}>{username}</span>
          <button onClick={handleLogout} style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>Sign out</button>
        </div>
      </div>

      {loadError && <p style={{ color: "red" }}>{loadError}</p>}

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
          aiEnabled={aiEnabled}
        />
      )}
    </div>
  );
}
