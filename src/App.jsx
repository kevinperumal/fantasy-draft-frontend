import { useEffect, useState } from "react";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";

const API_URL = import.meta.env.VITE_BACKEND_URL;

// Auth states: "loading" | "authenticated" | "unauthenticated"
export default function App() {
  const [authState, setAuthState] = useState("loading");
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      setAuthState("unauthenticated");
      return;
    }
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("unauthenticated");
      })
      .then((data) => {
        setUsername(data.username);
        setAuthState("authenticated");
      })
      .catch(() => {
        sessionStorage.removeItem("auth_token");
        setAuthState("unauthenticated");
      });
  }, []);

  function handleLogin(loggedInUsername) {
    setUsername(loggedInUsername);
    setAuthState("authenticated");
  }

  function handleLogout() {
    setUsername(null);
    setAuthState("unauthenticated");
  }

  if (authState === "loading") {
    return (
      <div style={{ padding: "2rem", color: "#555" }}>Loading…</div>
    );
  }

  if (authState === "unauthenticated") {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard username={username} onLogout={handleLogout} />;
}
