import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Icon } from "../components/Icon.js";
import { TOPIC_ICON } from "../components/iconArt.js";

interface Topic {
  slug: string;
  name: string;
  icon: string | null;
  kind: string;
  questionCount: number;
  suggested: boolean;
  selected: boolean;
}
interface Data { region: string | null; selected: string[]; topics: Topic[] }

const REGIONS = [
  { v: "catalunya", l: "Catalunya" },
  { v: "espanya", l: "Espanya" },
  { v: "mon", l: "Món / Altres" },
];

/** Dedueix la regió de l'idioma del navegador (la primera vegada). */
function detectRegion(): string {
  const l = (navigator.language || "").toLowerCase();
  if (l.startsWith("ca")) return "catalunya";
  if (l.startsWith("es")) return "espanya";
  return "mon";
}

export function TopicsConfig() {
  const [data, setData] = useState<Data | null>(null);

  async function reload() {
    setData(await api<Data>("/topics"));
  }

  useEffect(() => {
    (async () => {
      let d = await api<Data>("/topics");
      if (d.region == null) {
        // Deducció automàtica: si parla català → Catalunya, etc.
        await api("/me/region", { method: "PUT", body: { region: detectRegion() } });
        d = await api<Data>("/topics");
      }
      setData(d);
    })();
  }, []);

  async function setRegion(region: string) {
    await api("/me/region", { method: "PUT", body: { region } });
    reload();
  }

  async function toggle(slug: string) {
    if (!data) return;
    const sel = new Set(data.selected);
    sel.has(slug) ? sel.delete(slug) : sel.add(slug);
    const arr = [...sel];
    await api("/me/topics", { method: "PUT", body: { topics: arr } });
    setData({ ...data, selected: arr, topics: data.topics.map((t) => ({ ...t, selected: sel.has(t.slug) })) });
  }

  if (!data) return <p style={{ color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)" }}>Carregant temàtiques…</p>;

  return (
    <div>
      <div className="qc-label" style={{ marginBottom: "var(--qc-2)" }}>D'on ets · per suggerir-te temàtiques</div>
      <div style={{ display: "flex", gap: "var(--qc-2)", marginBottom: "var(--qc-4)", flexWrap: "wrap" }}>
        {REGIONS.map((r) => (
          <button key={r.v} onClick={() => setRegion(r.v)}
            className={`qc-btn${data.region === r.v ? " qc-btn--primary" : ""}`}
            style={{ minHeight: 40, padding: "var(--qc-2) var(--qc-3)", fontSize: "var(--qc-t-small)" }}>
            {r.l}
          </button>
        ))}
      </div>

      <div className="qc-label" style={{ marginBottom: "var(--qc-2)" }}>Temàtiques · cap seleccionada = totes</div>
      <div style={{ display: "flex", gap: "var(--qc-2)", flexWrap: "wrap" }}>
        {data.topics.map((t) => (
          <button key={t.slug} onClick={() => toggle(t.slug)} disabled={t.questionCount === 0}
            className={`qc-btn${t.selected ? " qc-btn--primary" : ""}`}
            style={{ minHeight: 40, padding: "var(--qc-2) var(--qc-3)", fontSize: "var(--qc-t-small)" }}>
            {/* Les seccions regionals no tenen icona pròpia i no en tindran: en són moltes i
                dibuixar-ne una per país seria un joc d'icones dins del joc d'icones. Cauen a
                la bandera, que ja llegeix com a «un lloc» i es queda dins del sistema. */}
            {TOPIC_ICON[t.slug]
              ? <Icon name={TOPIC_ICON[t.slug]} size={16} />
              : t.kind === "region" && <Icon name="flag" size={16} />}
            {t.name}
            <span className="qc-num" style={{ opacity: 0.7 }}>{t.questionCount}</span>
            {t.suggested && <Icon name="star" size={14} label="Recomanat per a tu" />}
          </button>
        ))}
      </div>
    </div>
  );
}
