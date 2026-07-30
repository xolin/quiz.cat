import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Icon } from "../components/Icon.js";

interface AQ {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctId: string;
  likes: number;
  dislikes: number;
  author: string;
}

// Cua de moderació (admin): els casos que l'auto-triatge no ha decidit, ordenats per vots.
export function Admin(props: { onBack: () => void }) {
  const [queue, setQueue] = useState<AQ[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    api<AQ[]>("/admin/review").then(setQueue);
  }
  useEffect(load, []);

  async function act(id: string, action: "publish" | "reject") {
    setBusy(id);
    try {
      await api(`/admin/questions/${id}/${action}`, { method: "POST" });
      setQueue((q) => (q ? q.filter((x) => x.id !== id) : q));
    } finally {
      setBusy(null);
    }
  }

  if (!queue) return <p className="qc-screen">Carregant…</p>;

  return (
    <div className="qc-screen">
      <div className="qc-lower-third qc-lower-third--plain" style={{ ["--qc-section" as string]: "var(--qc-cult)" }}>
        <span className="qc-lower-third__section"><Icon name="tools" size={16} /> Moderació</span>
        <span className="qc-lower-third__meta">
          Ordenades per senyal de la comunitat
          <span style={{ marginLeft: "auto" }}><b className="qc-num">{queue.length}</b> a la cua</span>
        </span>
      </div>

      <div style={{ display: "grid", gap: "var(--qc-3)" }}>
        {queue.map((q) => (
          <div key={q.id} className="qc-panel">
            <div className="qc-label" style={{ display: "flex", gap: "var(--qc-3)" }}>
              <span>de {q.author}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="thumbUp" size={13} /> {q.likes}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="thumbDown" size={13} /> {q.dislikes}</span>
            </div>
            <div style={{ fontStretch: "80%", fontWeight: 700, margin: "var(--qc-2) 0" }}>{q.prompt}</div>
            <div style={{ display: "grid", gap: 2, marginBottom: "var(--qc-3)" }}>
              {q.options.map((o) => (
                <div key={o.id} style={{
                  display: "flex", alignItems: "center", gap: "var(--qc-2)", fontSize: "var(--qc-t-small)",
                  color: o.id === q.correctId ? "var(--qc-good)" : "var(--qc-ink-dim)",
                }}>
                  {o.id === q.correctId ? <Icon name="check" size={14} /> : <span style={{ width: 14 }}>·</span>}
                  {o.text}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "var(--qc-2)" }}>
              <button className="qc-btn" style={{ minHeight: 42, borderColor: "var(--qc-good)", color: "var(--qc-good)" }}
                onClick={() => act(q.id, "publish")} disabled={busy === q.id}>Publica</button>
              <button className="qc-btn" style={{ minHeight: 42, borderColor: "var(--qc-live)", color: "var(--qc-live)" }}
                onClick={() => act(q.id, "reject")} disabled={busy === q.id}>Rebutja</button>
            </div>
          </div>
        ))}
        {queue.length === 0 && <p className="qc-panel" style={{ color: "var(--qc-ink-dim)" }}>Res per moderar.</p>}
      </div>

      <button className="qc-btn" style={{ marginTop: "var(--qc-5)" }} onClick={props.onBack}><Icon name="arrowLeft" size={18} /> Torna</button>
    </div>
  );
}
