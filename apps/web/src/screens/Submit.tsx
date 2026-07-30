import { useState } from "react";
import { api } from "../api.js";
import { Icon } from "../components/Icon.js";

const TOPICS = [
  { slug: "mon", label: "Món" },
  { slug: "historia", label: "Història" },
  { slug: "ciencia", label: "Ciència" },
  { slug: "cultura", label: "Cultura" },
  { slug: "catalunya", label: "Catalunya" },
  { slug: "espanya", label: "Espanya" },
];

export function Submit(props: { onBack: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correct, setCorrect] = useState(0);
  const [topic, setTopic] = useState("mon");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function setOpt(i: number, v: string) {
    setOptions((o) => o.map((x, j) => (j === i ? v : x)));
  }

  async function submit() {
    setBusy(true); setMsg(null);
    try {
      await api("/questions/submit", { method: "POST", body: { prompt, options, correctIndex: correct, topicSlug: topic } });
      setMsg({ ok: true, text: "Gràcies! La teva pregunta anirà a revisió de la comunitat." });
      setPrompt(""); setOptions(["", ""]); setCorrect(0);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="qc-screen">
      <div className="qc-lower-third qc-lower-third--plain" style={{ ["--qc-section" as string]: "var(--qc-sci)" }}>
        <span className="qc-lower-third__section"><Icon name="plus" size={16} /> Proposa</span>
        <span className="qc-lower-third__meta">La comunitat vota si es publica</span>
      </div>

      <label className="qc-label" style={{ display: "block", marginBottom: "var(--qc-2)" }} htmlFor="qc-prompt">Enunciat</label>
      <textarea id="qc-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2}
        placeholder="Ex: Quin riu passa per…?" style={{ width: "100%" }} />

      <label className="qc-label" style={{ display: "block", margin: "var(--qc-4) 0 var(--qc-2)" }}>Respostes · marca la correcta</label>
      <div style={{ display: "grid", gap: "var(--qc-2)" }}>
        {options.map((o, i) => (
          <div key={i} style={{ display: "flex", gap: "var(--qc-2)", alignItems: "center" }}>
            <input type="radio" name="correct" checked={correct === i} onChange={() => setCorrect(i)} title="Correcta" />
            <input value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`Resposta ${i + 1}`}
              style={{ flex: 1 }} />
            {options.length > 2 && (
              <button className="qc-btn qc-btn--ghost" style={{ minHeight: 44, padding: "var(--qc-2)" }}
                onClick={() => { setOptions((os) => os.filter((_, j) => j !== i)); if (correct >= i) setCorrect(Math.max(0, correct - 1)); }}>
                <Icon name="cross" size={16} label={`Esborra la resposta ${i + 1}`} />
              </button>
            )}
          </div>
        ))}
      </div>
      {options.length < 4 && (
        <button className="qc-btn" style={{ marginTop: "var(--qc-2)", minHeight: 42 }} onClick={() => setOptions([...options, ""])}><Icon name="plus" size={16} /> Afegeix resposta</button>
      )}

      <label className="qc-label" style={{ display: "block", margin: "var(--qc-4) 0 var(--qc-2)" }} htmlFor="qc-topic">Temàtica</label>
      <select id="qc-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
        {TOPICS.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
      </select>

      {msg && <p className="qc-panel" style={{ marginTop: "var(--qc-4)", color: msg.ok ? "var(--qc-good)" : "var(--qc-live)", borderColor: msg.ok ? "var(--qc-good)" : "var(--qc-live)" }}>{msg.text}</p>}

      <div style={{ display: "flex", gap: "var(--qc-2)", marginTop: "var(--qc-5)" }}>
        <button className="qc-btn qc-btn--primary" style={{ flex: 1 }} onClick={submit} disabled={busy}>Envia</button>
        <button className="qc-btn" onClick={props.onBack}><Icon name="arrowLeft" size={18} /> Torna</button>
      </div>
    </div>
  );
}
