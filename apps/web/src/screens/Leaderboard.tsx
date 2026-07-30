import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Icon } from "../components/Icon.js";

interface Entry {
  rank: number;
  displayName: string;
  level: number;
  score: number;
  you: boolean;
}

const SCOPES = [
  { key: "global", label: "Global" },
  { key: "daily", label: "Repte d'avui" },
  { key: "survival", label: "Survival" },
] as const;

export function Leaderboard(props: { onBack: () => void }) {
  const [scope, setScope] = useState<"global" | "daily" | "survival">("global");
  const [data, setData] = useState<{ top: Entry[]; you: Entry | null } | null>(null);

  useEffect(() => {
    setData(null);
    api(`/leaderboard?scope=${scope}`).then(setData);
  }, [scope]);

  const row = (e: Entry, key: string | number) => (
    <div key={key} className="qc-row" style={{ background: e.you ? "var(--qc-stage-3)" : undefined }}>
      <span className="qc-num" style={{ width: 42, color: e.rank <= 3 ? "var(--qc-amber)" : "var(--qc-ink-dim)" }}>
        {e.rank}
      </span>
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {e.displayName}{e.you && <span className="qc-label" style={{ marginLeft: "var(--qc-2)" }}>tu</span>}
      </span>
      <span className="qc-num" style={{ color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)" }}>lvl {e.level}</span>
      <span className="qc-num" style={{ fontSize: "1.125rem", minWidth: 64, textAlign: "right" }}>
        {e.score.toLocaleString("ca")}
      </span>
    </div>
  );

  return (
    <div className="qc-screen">
      <div className="qc-lower-third qc-lower-third--plain" style={{ ["--qc-section" as string]: "var(--qc-amber)" }}>
        <span className="qc-lower-third__section"><Icon name="trophy" size={16} /> Rànquing</span>
        <span className="qc-lower-third__meta">
          {scope === "survival" ? "Rondes superades a la millor tirada" : "Punts acumulats"}
        </span>
      </div>

      {/* Selector de taula: com un canvi de canal, no com tres botons solts. */}
      <div style={{ display: "flex", gap: 1, marginBottom: "var(--qc-4)" }}>
        {SCOPES.map((s) => (
          <button key={s.key} onClick={() => setScope(s.key)}
            className={`qc-btn${scope === s.key ? " qc-btn--primary" : ""}`}
            style={{ flex: 1, minHeight: 42, borderRadius: 0, fontSize: "var(--qc-t-small)" }}>
            {s.label}
          </button>
        ))}
      </div>

      {!data ? (
        <p style={{ color: "var(--qc-ink-dim)" }}>Carregant…</p>
      ) : data.top.length === 0 ? (
        <p className="qc-panel" style={{ color: "var(--qc-ink-dim)" }}>
          Encara no hi ha puntuacions{scope === "daily" ? " al repte d'avui" : scope === "survival" ? " de survival" : ""}.
        </p>
      ) : (
        <div className="qc-panel" style={{ padding: "var(--qc-2) var(--qc-4)" }}>
          {data.top.map((e) => row(e, e.rank))}
          {data.you && !data.top.some((t) => t.you) && row({ ...data.you, displayName: data.you.displayName }, "you")}
        </div>
      )}

      <button className="qc-btn" style={{ marginTop: "var(--qc-5)" }} onClick={props.onBack}>
        <Icon name="arrowLeft" size={18} /> Torna
      </button>
    </div>
  );
}
