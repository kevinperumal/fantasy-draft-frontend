export default function RecommendationPanel({ recommendation, loading, error, onGenerate }) {
  const borderStyle = { border: "1px solid #ddd", borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "0.5rem" };

  if (loading) {
    return (
      <div style={{ ...borderStyle, color: "#555" }}>
        Generating recommendation…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...borderStyle, color: "#dc2626" }}>
        <strong>Error:</strong> {error}
        <button onClick={onGenerate} style={{ marginLeft: "0.75rem", fontSize: "0.85rem" }}>Retry</button>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div style={{ ...borderStyle }}>
        <button onClick={onGenerate} style={{ fontWeight: 600 }}>Get Recommendation</button>
        <span style={{ color: "#888", fontSize: "0.85rem", marginLeft: "0.75rem" }}>
          Analyzes your roster and available players
        </span>
      </div>
    );
  }

  const { topPick, alternatives, likelyGone, canWait, context, generatedAt } = recommendation;

  return (
    <div style={{ border: "1px solid #2563eb", borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem", background: "#f8faff" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: "#1d4ed8" }}>AI Recommendation</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.8rem", color: "#888" }}>
            Pick #{context.currentPick}
            {context.nextPick ? ` · next: #${context.nextPick} (${context.picksUntilNext} away)` : ""}
            {" · "}
            {context.rosterCount}/25 drafted
          </span>
          <button onClick={onGenerate} style={{ fontSize: "0.85rem" }}>Refresh</button>
        </div>
      </div>

      {/* Top pick */}
      {topPick && (
        <div style={{ background: "#eff6ff", borderRadius: 6, padding: "0.875rem 1rem", marginBottom: "1rem", borderLeft: "4px solid #2563eb" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <strong style={{ fontSize: "1.1rem" }}>{topPick.player}</strong>
            <span style={{ color: "#555", fontSize: "0.9rem" }}>{topPick.position}</span>
            <span style={{ color: "#2563eb", fontSize: "0.85rem", fontWeight: 600 }}>RW #{topPick.rotowireRank}</span>
          </div>
          <p style={{ margin: 0, color: "#374151", lineHeight: 1.5 }}>{topPick.explanation}</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
        {/* Likely gone */}
        {likelyGone?.length > 0 && (
          <Section title="⚠ Likely Gone Before Next Pick" color="#b91c1c" bg="#fef2f2">
            {likelyGone.map((p) => (
              <PlayerRow key={p.player} name={p.player} position={p.position} note={p.reason} />
            ))}
          </Section>
        )}

        {/* Can wait */}
        {canWait?.length > 0 && (
          <Section title="✓ Can Probably Wait" color="#15803d" bg="#f0fdf4">
            {canWait.map((p) => (
              <PlayerRow key={p.player} name={p.player} position={p.position} note={p.reason} />
            ))}
          </Section>
        )}

        {/* Alternatives */}
        {alternatives?.length > 0 && (
          <Section title="Alternatives" color="#374151" bg="#f9fafb">
            {alternatives.map((p) => (
              <PlayerRow key={p.player} name={p.player} position={p.position} note={p.reason} rank={p.rotowireRank} />
            ))}
          </Section>
        )}
      </div>

      <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#aaa" }}>
        Generated {new Date(generatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}

function Section({ title, color, bg, children }) {
  return (
    <div style={{ background: bg, borderRadius: 6, padding: "0.75rem" }}>
      <div style={{ fontWeight: 600, fontSize: "0.8rem", color, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>{children}</div>
    </div>
  );
}

function PlayerRow({ name, position, note, rank }) {
  return (
    <div>
      <span style={{ fontWeight: 600 }}>{name}</span>
      <span style={{ color: "#555", fontSize: "0.85rem" }}> {position}</span>
      {rank && <span style={{ color: "#888", fontSize: "0.8rem" }}> RW#{rank}</span>}
      {note && <div style={{ color: "#555", fontSize: "0.8rem", marginTop: "0.1rem" }}>{note}</div>}
    </div>
  );
}
