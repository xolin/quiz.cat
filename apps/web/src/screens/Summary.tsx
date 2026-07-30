import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Mascot } from "../components/Mascot.js";
import { Icon } from "../components/Icon.js";

interface SummaryData {
  status: string;
  mode: string;
  score: number;
  correct: number;
  total: number;
  streak: number | null; // survival: fins on has arribat
  rounds: Array<{ index: number; questionId: string; prompt: string | null; typeSlug: string; isCorrect: boolean | null; points: number; responseMs: number | null }>;
}

export function Summary(props: { matchId: string; progression: any; onHome: () => void; onPlayAgain: () => void }) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [skill, setSkill] = useState<{ skill: number; skillLabel: string } | null>(null);
  // Valoració de preguntes: viu aquí i no al toast de la partida, on el dit no hi arribava
  // abans que l'auto-avanç se l'endugués.
  const [rated, setRated] = useState<Record<string, number>>({});

  function rate(questionId: string, vote: number) {
    setRated((r) => ({ ...r, [questionId]: vote }));
    api(`/questions/${questionId}/vote`, { method: "POST", body: { vote } }).catch(() => {});
  }

  useEffect(() => {
    api<SummaryData>(`/matches/${props.matchId}/summary`).then(setData);
    api<{ skill: number; skillLabel: string }>("/me").then(setSkill).catch(() => {});
  }, [props.matchId]);

  if (!data) return <p className="qc-screen">Carregant…</p>;

  const p = props.progression;
  const survival = data.mode === "survival";
  const perfect = survival && data.streak === data.total;
  // Al survival la xifra que importa és fins on has arribat; si no, els punts.
  const headline = survival ? (perfect ? data.streak ?? 0 : (data.streak ?? 0) + 1) : data.score;
  const headlineLabel = survival ? (perfect ? "rondes seguides" : "has arribat a la ronda") : "punts";

  return (
    <div className="qc-screen">
      <div className="qc-lower-third qc-lower-third--plain" style={{ ["--qc-section" as string]: survival ? "var(--qc-live)" : "var(--qc-amber)" }}>
        <span className="qc-lower-third__section">{survival ? "Fi de la tirada" : "Resultat"}</span>
        <span className="qc-lower-third__meta">
          {survival ? "Survival" : data.mode === "daily" ? "Repte diari" : "Partida ràpida"}
        </span>
      </div>

      {/* Resultat: la xifra manda i el gat la comenta. */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--qc-4)", marginBottom: "var(--qc-5)" }}>
        <Mascot size={72} mood={perfect ? "sorpres" : survival ? "ko" : data.correct > data.total / 2 ? "content" : "trist"} />
        <div>
          <span className="qc-label">{headlineLabel}</span>
          <div className="qc-num" style={{ fontSize: "var(--qc-t-score)", lineHeight: 1 }}>
            {headline.toLocaleString("ca")}
          </div>
          <div style={{ color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)" }}>
            {survival
              ? `${data.score.toLocaleString("ca")} punts`
              : `${data.correct}/${data.total} encerts`}
          </div>
        </div>
      </div>

      {p && (
        <div className="qc-scoreboard" style={{ marginBottom: "var(--qc-4)" }}>
          <div className="qc-scoreboard__cell">
            <span className="qc-scoreboard__label">XP</span>
            <span className="qc-scoreboard__value qc-num">+{p.xpGained}</span>
          </div>
          <div className="qc-scoreboard__cell">
            <span className="qc-scoreboard__label">Ratxa diària</span>
            <span className="qc-scoreboard__value qc-num">{p.dailyStreak}</span>
          </div>
          {skill && (
            <div className="qc-scoreboard__cell">
              <span className="qc-scoreboard__label">Repte</span>
              <span className="qc-scoreboard__value qc-num">{skill.skill.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}

      {p?.leveledUp && (
        <p className="qc-panel" style={{ display: "flex", alignItems: "center", gap: "var(--qc-3)", marginBottom: "var(--qc-4)" }}>
          <Icon name="star" size={20} /> <b>Puges a nivell {p.levelAfter}</b>
        </p>
      )}
      {p?.unlockedAchievements?.length > 0 && (
        <p className="qc-panel" style={{ display: "flex", alignItems: "center", gap: "var(--qc-3)", marginBottom: "var(--qc-4)" }}>
          <Icon name="party" size={20} /> Nou assoliment: <b>{p.unlockedAchievements.join(", ")}</b>
        </p>
      )}

      <div className="qc-panel" style={{ padding: "var(--qc-2) var(--qc-4)" }}>
        {data.rounds.map((r) => (
          <div key={r.index} className="qc-row">
            <span style={{ color: r.isCorrect == null ? "var(--qc-ink-dim)" : r.isCorrect ? "var(--qc-good)" : "var(--qc-live)", display: "flex" }}>
              {r.isCorrect == null ? "–" : r.isCorrect ? <Icon name="check" size={18} /> : <Icon name="cross" size={18} />}
            </span>
            <span style={{ flex: 1, fontSize: "var(--qc-t-small)", minWidth: 0 }}>{r.prompt}</span>
            <span className="qc-num" style={{ whiteSpace: "nowrap", color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)" }}>
              +{r.points}
              {r.responseMs != null && ` · ${(r.responseMs / 1000).toFixed(1)}s`}
            </span>
            {rated[r.questionId] != null ? (
              <span className="qc-label" style={{ minWidth: 44, textAlign: "right" }}>gràcies</span>
            ) : (
              <span style={{ display: "flex", gap: 2 }}>
                <button className="qc-btn qc-btn--ghost qc-btn--icon" onClick={() => rate(r.questionId, 1)}>
                  <Icon name="thumbUp" size={18} label={`bona pregunta: ${r.prompt ?? "ronda " + (r.index + 1)}`} />
                </button>
                <button className="qc-btn qc-btn--ghost qc-btn--icon" onClick={() => rate(r.questionId, -1)}>
                  <Icon name="thumbDown" size={18} label={`mala pregunta: ${r.prompt ?? "ronda " + (r.index + 1)}`} />
                </button>
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "var(--qc-2)", marginTop: "var(--qc-5)" }}>
        <button className="qc-btn qc-btn--primary" style={{ flex: 1 }} onClick={props.onPlayAgain}>
          <Icon name="replay" size={18} /> Torna a jugar
        </button>
        <button className="qc-btn" style={{ flex: 1 }} onClick={props.onHome}>
          <Icon name="home" size={18} /> Inici
        </button>
      </div>
    </div>
  );
}
