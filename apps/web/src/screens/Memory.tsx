import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { Icon } from "../components/Icon.js";
import { Mascot } from "../components/Mascot.js";

// Mini-joc memory (parelles de banderes). El servidor és l'àrbitre: guarda el deck i calcula els crèdits.
// El client només demana girar cartes i mostra el que el servidor revela.

interface Start { sessionId: string; cards: number; pairs: number; energy: number }

export function Memory(props: { onDone: () => void }) {
  const [start, setStart] = useState<Start | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState<{ credits: number; total: number } | null>(null);
  const firstFlip = useRef<number | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    api<Start & { error?: string }>("/minigame/memory", { method: "POST" })
      .then((s) => setStart(s))
      .catch((e) => setError(e.message));
  }, []);

  async function flip(index: number) {
    if (busy.current || matched.has(index) || revealed[index] !== undefined || done) return;
    busy.current = true;
    try {
      const r = await api<any>(`/minigame/${start!.sessionId}/flip`, { method: "POST", body: { index } });
      if (r.awaiting) {
        setRevealed((v) => ({ ...v, [index]: r.value }));
        firstFlip.current = index;
        busy.current = false;
        return;
      }
      // Segona carta: mostra totes dues.
      setRevealed((v) => ({ ...v, [index]: r.value, [r.firstIndex]: r.firstValue }));
      setMoves(r.moves);
      if (r.match) {
        setTimeout(() => {
          setMatched((m) => new Set([...m, index, r.firstIndex]));
          firstFlip.current = null;
          busy.current = false;
        }, 350);
        if (r.done) setDone({ credits: r.credits, total: r.totalCredits });
      } else {
        // Falla: mostra 900ms i amaga les dues.
        setTimeout(() => {
          setRevealed((v) => {
            const n = { ...v };
            delete n[index];
            delete n[r.firstIndex];
            return n;
          });
          firstFlip.current = null;
          busy.current = false;
        }, 900);
      }
    } catch (e: any) {
      setError(e.message);
      busy.current = false;
    }
  }

  if (error) return (
    <div className="qc-screen">
      <div className="qc-lower-third qc-lower-third--plain" style={{ ["--qc-section" as string]: "var(--qc-live)" }}>
        <span className="qc-lower-third__section"><Icon name="puzzle" size={16} /> Memory</span>
      </div>
      <p className="qc-panel" style={{ borderColor: "var(--qc-live)", color: "var(--qc-live-text)" }}>
        {error === "energia_insuficient" ? "No tens prou energia." : error}
      </p>
      <button className="qc-btn" onClick={props.onDone}><Icon name="arrowLeft" size={18} /> Torna</button>
    </div>
  );
  if (!start) return <p className="qc-screen">Preparant el mini-joc…</p>;

  const cols = start.cards <= 12 ? 4 : 5;

  return (
    <div className="qc-screen">
      <div className="qc-lower-third qc-lower-third--plain" style={{ ["--qc-section" as string]: "var(--qc-amber)" }}>
        <span className="qc-lower-third__section"><Icon name="puzzle" size={16} /> Memory</span>
        <span className="qc-lower-third__meta">
          <span><b className="qc-num">{matched.size / 2}</b>/{start.pairs} parelles</span>
          <span style={{ marginLeft: "auto" }}><b className="qc-num">{moves}</b> moviments</span>
        </span>
      </div>
      <p style={{ color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)", marginTop: 0 }}>
        Troba les parelles de banderes. Com menys moviments i més ràpid, més crèdits.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "var(--qc-2)", maxWidth: 420, margin: "var(--qc-4) 0" }}>
        {Array.from({ length: start.cards }, (_, i) => {
          const isMatched = matched.has(i);
          const face = revealed[i];
          const up = isMatched || face !== undefined;
          return (
            <button key={i} onClick={() => flip(i)} disabled={up || !!done}
              className={`qc-memory-card${up ? " up" : ""}${isMatched ? " matched" : ""}`}
              style={{ cursor: up ? "default" : "pointer" }}>
              <div className="qc-memory-inner">
                <div className="qc-memory-face qc-memory-back" />
                <div className="qc-memory-face qc-memory-front">{face ?? ""}</div>
              </div>
            </button>
          );
        })}
      </div>

      {done ? (
        <div className="qc-panel" style={{ display: "flex", gap: "var(--qc-4)", alignItems: "center" }}>
          <Mascot size={64} mood="content" />
          <div>
            <span className="qc-label">Completat</span>
            <div className="qc-num" style={{ fontSize: "var(--qc-t-score)", lineHeight: 1, color: "var(--qc-amber)" }}>
              +{done.credits}
            </div>
            <p style={{ margin: "var(--qc-1) 0 var(--qc-3)", color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)" }}>
              {done.total} crèdits en total. Gasta'ls a la botiga.
            </p>
            <button className="qc-btn qc-btn--primary" onClick={props.onDone}>
              <Icon name="home" size={18} /> Torna
            </button>
          </div>
        </div>
      ) : (
        <a href="#" onClick={(e) => { e.preventDefault(); api(`/minigame/${start.sessionId}/abandon`, { method: "POST" }).then(props.onDone); }}
          style={{ color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)" }}>
          Abandona
        </a>
      )}
    </div>
  );
}
