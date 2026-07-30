import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Icon } from "../components/Icon.js";

interface Pack {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  priceCredits: number;
  questionCount: number;
  owned: boolean;
  affordable: boolean;
}

export function Premium(props: { onBack: () => void }) {
  const [data, setData] = useState<{ credits: number; packs: Pack[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    api<{ credits: number; packs: Pack[] }>("/premium").then(setData);
  }
  useEffect(load, []);

  async function unlock(slug: string) {
    setMsg(null);
    try {
      await api(`/premium/${slug}/unlock`, { method: "POST" });
      load();
    } catch (e: any) {
      setMsg(e.status === 402 ? "No tens prou crèdits." : e.message);
    }
  }

  if (!data) return <p className="qc-screen">Carregant…</p>;

  return (
    <div className="qc-screen">
      <div className="qc-lower-third qc-lower-third--plain" style={{ ["--qc-section" as string]: "var(--qc-amber)" }}>
        <span className="qc-lower-third__section"><Icon name="cart" size={16} /> Botiga</span>
        <span className="qc-lower-third__meta">
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--qc-1)" }}>
            <Icon name="coin" size={16} /> <b className="qc-num">{data.credits}</b>
          </span>
        </span>
      </div>
      <p style={{ color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)", marginTop: 0 }}>
        Desbloqueja packs de preguntes amb els crèdits dels mini-jocs.
      </p>
      {msg && <p className="qc-panel" style={{ color: "var(--qc-live)", borderColor: "var(--qc-live)" }}>{msg}</p>}

      <div className="qc-panel" style={{ padding: "var(--qc-2) var(--qc-4)", margin: "var(--qc-4) 0" }}>
        {data.packs.map((p) => (
          <div key={p.slug} className="qc-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontStretch: "80%", fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontSize: "var(--qc-t-small)", color: "var(--qc-ink-dim)" }}>
                {p.description} · <span className="qc-num">{p.questionCount}</span> preguntes
              </div>
            </div>
            {p.owned ? (
              <span style={{ display: "flex", alignItems: "center", gap: "var(--qc-1)", color: "var(--qc-good)", whiteSpace: "nowrap" }}>
                <Icon name="check" size={18} /> Teu
              </span>
            ) : (
              <button className={`qc-btn${p.affordable ? " qc-btn--primary" : ""}`} onClick={() => unlock(p.slug)}
                disabled={!p.affordable} style={{ whiteSpace: "nowrap", minHeight: 42 }}>
                <Icon name="coin" size={16} /> <span className="qc-num">{p.priceCredits}</span>
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="qc-label">Aviat: comprar packs i crèdits amb diners</p>
      <button className="qc-btn" style={{ marginTop: "var(--qc-4)" }} onClick={props.onBack}>
        <Icon name="arrowLeft" size={18} /> Torna
      </button>
    </div>
  );
}
