import { useEffect, useState } from "react";
import { api } from "../api.js";

/**
 * Perfil de coneixement per temàtica.
 *
 * DECISIONS QUE NO ES VEUEN MIRANT-LO:
 *
 * · **Només surten les temàtiques amb prou respostes.** El nivell d'un tema que amb prou
 *   feines has jugat ÉS el teu nivell global (el servidor l'encongeix cap allà a posta), o
 *   sigui que dibuixar-lo seria inventar-se una forma a partir de no saber res.
 *
 * · **L'ordre dels eixos és fix**, el que ve del servidor, i no per valor. La forma d'un
 *   radar depèn de l'ordre dels eixos: si s'ordenessin per nivell, la teva figura canviaria
 *   de silueta cada setmana sense que tu haguessis canviat, i no es podria comparar amb la
 *   d'abans.
 *
 * · **Anelles numerades i taula a sota.** Al radar, l'àrea creix amb el QUADRAT del valor,
 *   així que un 4 sembla el doble d'un 3 quan no ho és. Les anelles i els números deixen
 *   llegir els valors en comptes de jutjar taques, que és l'únic que fa honest un radar.
 *
 * · **To descriptiu, no de nota.** Al `decisions.md`: «hi ha gent que es pot sentir
 *   avaluada». Aquí no hi ha ni aprovats, ni percentatges, ni comparació amb ningú.
 */

interface RadarTopic {
  slug: string;
  name: string;
  kind: string;
  skill: number;
  answers: number;
  correct: number;
}
interface RadarData {
  skill: number;
  label: string;
  topics: RadarTopic[];
}

/** Respostes mínimes per dibuixar un eix. Per sota, el que sabem del tema és res. */
const MIN_ANSWERS = 5;

/** Sostre d'eixos. Més enllà, els noms es trepitgen i la figura deixa de llegir-se. */
const MAX_AXES = 8;

// El llenç és APAÏSAT tot i que el radar és rodó: els noms de les temàtiques surten cap
// als costats i «Països Baixos» o «Catalunya» no caben en un quadrat — es tallaven. El
// `viewBox` ample no fa el gràfic més gros, només li dona marge horitzontal per als noms.
const R = 100;
const BOX_W = 400;
const BOX_H = 300;
const CX = BOX_W / 2;
const CY = BOX_H / 2;

/** Nivell (1-5) → radi. L'1 no cau al centre: si no, un perfil baixet es veuria buit. */
const radius = (v: number) => R * (0.15 + (0.85 * (Math.max(1, Math.min(5, v)) - 1)) / 4);

/** Punt d'un eix. Comencem a dalt i anem en sentit horari. */
function point(i: number, n: number, r: number): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

export function SkillRadar() {
  const [data, setData] = useState<RadarData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<RadarData>("/me/radar").then(setData).catch(() => setFailed(true));
  }, []);

  if (failed) return null; // no és informació crítica: si falla, calla
  if (!data) {
    return <p style={{ color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)" }}>Carregant el perfil…</p>;
  }

  const played = data.topics.filter((t) => t.answers >= MIN_ANSWERS);
  const axes = played.length > MAX_AXES
    ? [...played].sort((a, b) => b.answers - a.answers).slice(0, MAX_AXES)
        // Reordenats com venien: l'ordre ha de ser estable entre visites.
        .sort((a, b) => data.topics.indexOf(a) - data.topics.indexOf(b))
    : played;

  const n = axes.length;
  // Amb menys de tres eixos no hi ha polígon, i forçar-lo seria dibuixar una ratlla.
  if (n < 3) {
    return (
      <div>
        <div className="qc-label" style={{ marginBottom: "var(--qc-2)" }}>El teu perfil per temàtica</div>
        <p style={{ margin: 0, color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)" }}>
          Encara no hi ha prou partides per dibuixar-lo. Cal haver respost {MIN_ANSWERS} preguntes
          d'almenys tres temàtiques{played.length > 0 ? ` (en portes ${played.length})` : ""}.
        </p>
      </div>
    );
  }

  const shape = axes.map((t, i) => point(i, n, radius(t.skill)).join(",")).join(" ");

  return (
    <div>
      <div className="qc-label" style={{ marginBottom: "var(--qc-2)" }}>
        El teu perfil per temàtica
      </div>

      <svg viewBox={`0 0 ${BOX_W} ${BOX_H}`} width="100%" style={{ maxWidth: 320, display: "block", margin: "0 auto" }}
        role="img" aria-label={`Nivell per temàtica: ${axes.map((t) => `${t.name} ${t.skill.toFixed(1)} de 5`).join(", ")}`}>
        {/* Anelles de nivell. Recessives: són referència, no dada. */}
        {[1, 2, 3, 4, 5].map((v) => (
          <polygon key={v}
            points={axes.map((_, i) => point(i, n, radius(v)).join(",")).join(" ")}
            fill="none" stroke="var(--qc-hairline)" strokeWidth={v === 5 ? 1.5 : 1} />
        ))}
        {/* Radis */}
        {axes.map((_, i) => {
          const [x, y] = point(i, n, radius(5));
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--qc-hairline)" strokeWidth={1} />;
        })}

        {/* La figura. Farciment discret: qui mana és el contorn i els punts. */}
        <polygon points={shape} fill="var(--qc-amber)" fillOpacity={0.16}
          stroke="var(--qc-amber)" strokeWidth={2} strokeLinejoin="round" />

        {axes.map((t, i) => {
          const [x, y] = point(i, n, radius(t.skill));
          return (
            <circle key={t.slug} cx={x} cy={y} r={4.5} fill="var(--qc-amber)"
              stroke="var(--qc-stage-2)" strokeWidth={2}>
              {/* Rètol natiu del navegador: sense dependències i el llegeix el lector de pantalla. */}
              <title>{`${t.name}: nivell ${t.skill.toFixed(1)} de 5 · ${t.answers} respostes`}</title>
            </circle>
          );
        })}

        {/* Números de les anelles, en un sol radi perquè no embrutin. Porten un halo del
            color del fons (`paintOrder`) perquè la figura hi pot passar just pel damunt. */}
        {[3, 5].map((v) => (
          <text key={v} x={CX + 5} y={CY - radius(v) + 4} fill="var(--qc-ink-dim)" fontSize={10}
            className="qc-num" stroke="var(--qc-stage-2)" strokeWidth={3} paintOrder="stroke">{v}</text>
        ))}

        {/* Noms dels eixos. El text va amb color de text, mai amb el de la sèrie. */}
        {axes.map((t, i) => {
          const [x, y] = point(i, n, R + 16);
          const anchor = Math.abs(x - CX) < 12 ? "middle" : x > CX ? "start" : "end";
          return (
            <text key={t.slug} x={x} y={y + 3} textAnchor={anchor}
              fill="var(--qc-ink-dim)" fontSize={11} style={{ fontStretch: "76%", fontWeight: 700 }}>
              {t.name}
            </text>
          );
        })}
      </svg>

      {/* Els mateixos números en text. És l'alternativa accessible al gràfic i, de passada,
          l'única manera honesta de comparar dos eixos d'un radar sense enganyar-se amb l'àrea. */}
      <ul style={{ listStyle: "none", margin: "var(--qc-3) 0 0", padding: 0, display: "grid", gap: "2px" }}>
        {axes.map((t) => (
          <li key={t.slug} style={{
            display: "flex", justifyContent: "space-between", gap: "var(--qc-3)",
            fontSize: "var(--qc-t-small)", color: "var(--qc-ink-dim)",
          }}>
            <span>{t.name}</span>
            <span>
              <b className="qc-num" style={{ color: "var(--qc-ink)" }}>{t.skill.toFixed(1)}</b>
              <span className="qc-num" style={{ opacity: 0.7 }}> · {t.answers} respostes</span>
            </span>
          </li>
        ))}
      </ul>
      {played.length > axes.length && (
        <p style={{ margin: "var(--qc-2) 0 0", fontSize: "var(--qc-t-label)", color: "var(--qc-ink-dim)" }}>
          Es dibuixen les {MAX_AXES} temàtiques que més has jugat.
        </p>
      )}
    </div>
  );
}
