import { useState } from "react";

const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        onLogin(data.username);
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "10vh auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>DraftPilot</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>
            <div style={{ marginBottom: "0.25rem" }}>Username</div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              style={{ width: "100%" }}
              required
            />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>
            <div style={{ marginBottom: "0.25rem" }}>Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ width: "100%" }}
              required
            />
          </label>
        </div>

        {error && (
          <p style={{ color: "red", marginBottom: "0.75rem" }}>{error}</p>
        )}

        <button type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
