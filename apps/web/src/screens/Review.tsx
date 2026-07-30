import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Icon } from "../components/Icon.js";
import { Mascot } from "../components/Mascot.js";

interface RQ {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctId: string;
  likes: number;
  dislikes: number;
  category: { name: string; icon: string | null } | null;
}

// Revisa preguntes de la comunitat: veus la pregunta amb la resposta marcada i la valores.
export function Review(props: { onBack: () => void }) {
  const [queue, setQueue] = useState<RQ[] | null>(null);
  const [i, setI] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [busy, setBusy] = useState(false);

  function load() {
    api<RQ[]>("/questions/review").then((q) => { setQueue(q); setI(0); });
  }
  useEffect(load, []);

  async function vote(v: 1 | -1) {
    if (!queue || busy) return;
    setBusy(true);
    try {
      await api(`/questions/${queue[i].id}/vote`, { method: "POST", body: { vote: v } });
      setReviewed((r) => r + 1);
      if (i + 1 < queue.length) setI(i + 1);
      else load(); // recarrega més
    } finally {
      setBusy(false);
    }
  }

  if (!queue) return <p className="qc-screen">Carregant…</p>;

  const q = queue[i];
  return (
    <div className="qc-screen">
      <div className="qc-lower-third qc-lower-third--plain" style={{ ["--qc-section" as string]: "var(--qc-sci)" }}>
        <span className="qc-lower-third__section"><Icon name="search" size={16} /> Revisa</span>
        <span className="qc-lower-third__meta">
          Decideix quines preguntes es queden
          <span style={{ marginLeft: "auto" }}><b className="qc-num">{reviewed}</b> revisades</span>
        </span>
      </div>

      {!q ? (
        <div className="qc-panel" style={{ textAlign: "center" }}>
          <Mascot size={72} mood="content" />
          <p style={{ color: "var(--qc-ink-dim)" }}>Ara mateix no hi ha res per revisar. Gràcies!</p>
          <button className="qc-btn" onClick={props.onBack}><Icon name="arrowLeft" size={18} /> Torna</button>
        </div>
      ) : (
        <>
          <div className="qc-panel" style={{ margin: "var(--qc-4) 0" }}>
            <div className="qc-label">{q.category?.name}</div>
            <h2 style={{ margin: "var(--qc-2) 0 var(--qc-4)", fontSize: "1.25rem" }}>{q.prompt}</h2>
            <div style={{ display: "grid", gap: "var(--qc-1)" }}>
              {q.options.map((o) => (
                <div key={o.id} style={{
                  display: "flex", alignItems: "center", gap: "var(--qc-2)",
                  padding: "var(--qc-2) var(--qc-3)", borderRadius: "var(--qc-r)",
                  background: o.id === q.correctId ? "var(--qc-good)" : "var(--qc-stage-3)",
                  color: o.id === q.correctId ? "var(--qc-ink-on-light)" : "var(--qc-ink)",
                  fontWeight: o.id === q.correctId ? 700 : 400,
                }}>
                  {o.id === q.correctId && <Icon name="check" size={16} />}
                  {o.text}
                </div>
              ))}
            </div>
            <div className="qc-label" style={{ marginTop: "var(--qc-3)", display: "flex", gap: "var(--qc-3)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="thumbUp" size={14} /> {q.likes}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="thumbDown" size={14} /> {q.dislikes}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "var(--qc-2)" }}>
            <button className="qc-btn" style={{ flex: 1, borderColor: "var(--qc-good)", color: "var(--qc-good)" }}
              onClick={() => vote(1)} disabled={busy}>
              <Icon name="thumbUp" size={18} /> Bona
            </button>
            <button className="qc-btn" style={{ flex: 1, borderColor: "var(--qc-live)", color: "var(--qc-live)" }}
              onClick={() => vote(-1)} disabled={busy}>
              <Icon name="thumbDown" size={18} /> Dolenta
            </button>
          </div>
          <p style={{ marginTop: "var(--qc-5)" }}>
            <a href="#" onClick={(e) => { e.preventDefault(); props.onBack(); }}
              style={{ color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)" }}>Torna</a>
          </p>
        </>
      )}
    </div>
  );
}
