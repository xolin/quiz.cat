import { useEffect, useState } from "react";
import { api, setToken } from "../api.js";
import { TopicsConfig } from "./TopicsConfig.js";
import { SkillRadar } from "../components/SkillRadar.js";
import { Mascot } from "../components/Mascot.js";
import { Icon } from "../components/Icon.js";
import type { IconName } from "../components/iconArt.js";

export type Difficulty = "easy" | "normal" | "hard" | "adaptive";

interface Me {
  displayName: string | null;
  xp: number;
  level: number;
  nextLevelXp: number | null;
  skill: number;
  skillLabel: string;
  energy: number;
  energyMax: number;
  energyMsToNext: number;
  credits: number;
  minigameCost: number;
  role: string;
  currentStreak: number;
  matchesPlayed: number;
  accuracy: number | null;
  achievements: Array<{ slug: string; name: string; icon: string | null }>;
}

const DIFFICULTIES: Array<{ key: Difficulty; label: string; hint: string }> = [
  { key: "easy", label: "Fàcil", hint: "Preguntes senzilles per escalfar." },
  { key: "normal", label: "Normal", hint: "Barreja equilibrada." },
  { key: "hard", label: "Difícil", hint: "Només per a experts." },
  { key: "adaptive", label: "Adaptatiu", hint: "S'ajusta al teu nivell mentre jugues." },
];

/** Camp de mode: un bloc de color que ocupa regió, no una targeta amb icona i text. */
function Mode(props: {
  title: string;
  line: string;
  icon: IconName;
  field?: string;
  dark?: boolean;
  disabled?: boolean;
  title2?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`qc-mode${props.dark ? " qc-mode--dark" : ""}`}
      style={{ ["--qc-field" as string]: props.field }}
      disabled={props.disabled}
      title={props.title2}
      onClick={props.onClick}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "var(--qc-2)" }}>
        <Icon name={props.icon} size={22} />
        <span className="qc-mode__title">{props.title}</span>
      </span>
      <span className="qc-mode__line">{props.line}</span>
    </button>
  );
}

export function Home(props: {
  onPlay: (mode: "solo" | "daily" | "survival", difficulty: Difficulty) => void;
  onLeaderboard: () => void;
  onMinigame: () => void;
  onPremium: () => void;
  onSubmit: () => void;
  onReview: () => void;
  onAdmin: () => void;
  onLogout: () => void;
}) {
  const [me, setMe] = useState<Me | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(
    (localStorage.getItem("qj_difficulty") as Difficulty) || "adaptive",
  );

  useEffect(() => {
    api<Me>("/me").then(setMe).catch(() => { setToken(null); props.onLogout(); });
  }, []);

  function chooseDifficulty(d: Difficulty) {
    setDifficulty(d);
    localStorage.setItem("qj_difficulty", d);
  }

  if (!me) return <p className="qc-screen">Carregant…</p>;

  const skillPct = Math.round(((me.skill - 1) / 4) * 100);
  const energyPct = Math.round((100 * me.energy) / me.energyMax);
  const energyFull = me.energy >= me.minigameCost;
  const diffLabel = DIFFICULTIES.find((d) => d.key === difficulty)!.label;

  return (
    <div className="qc-screen">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--qc-3)" }}>
        <div style={{ display: "flex", gap: "var(--qc-3)", alignItems: "center", minWidth: 0 }}>
          {/* El gat fa d'amfitrió: dorm quan no queda energia per al mini-joc. */}
          <Mascot mood={energyFull ? "neutre" : "adormit"} size={48} />
          <div style={{ minWidth: 0 }}>
            <span className="qc-label">Hola</span>
            <h1 style={{ fontSize: "1.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {me.displayName ?? "jugador/a"}
            </h1>
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--qc-2)", alignItems: "center" }}>
          <button className="qc-btn qc-btn--ghost" style={{ minHeight: 44, padding: "var(--qc-2)" }}
            onClick={() => setShowSettings(true)}>
            <Icon name="settings" size={20} label="Configuració" />
          </button>
          <a href="#" onClick={(e) => { e.preventDefault(); setToken(null); props.onLogout(); }}
            style={{ fontSize: "var(--qc-t-small)", color: "var(--qc-ink-dim)" }}>Surt</a>
        </div>
      </header>

      {/* Marcador del jugador: la forma nativa d'aquest món per a xifres d'estat. */}
      <div className="qc-scoreboard" style={{ margin: "var(--qc-4) 0" }}>
        <div className="qc-scoreboard__cell">
          <span className="qc-scoreboard__label">Nivell</span>
          <span className="qc-scoreboard__value qc-num">{me.level}</span>
        </div>
        <div className="qc-scoreboard__cell">
          <span className="qc-scoreboard__label">Ratxa</span>
          <span className="qc-scoreboard__value qc-num" style={{ color: me.currentStreak > 0 ? "var(--qc-amber)" : undefined }}>
            {me.currentStreak}
          </span>
        </div>
        <div className="qc-scoreboard__cell">
          <span className="qc-scoreboard__label">Partides</span>
          <span className="qc-scoreboard__value qc-num">{me.matchesPlayed}</span>
        </div>
        <div className="qc-scoreboard__cell">
          <span className="qc-scoreboard__label">Encert</span>
          <span className="qc-scoreboard__value qc-num">{me.accuracy != null ? `${me.accuracy}%` : "—"}</span>
        </div>
        <div className="qc-scoreboard__cell">
          <span className="qc-scoreboard__label">Crèdits</span>
          <span className="qc-scoreboard__value qc-num">{me.credits}</span>
        </div>
      </div>

      {/* Mesuradors d'estudi: energia i nivell de repte */}
      <div style={{ display: "grid", gap: "var(--qc-3)", marginBottom: "var(--qc-5)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--qc-1)" }}>
            <span className="qc-label" style={{ display: "flex", alignItems: "center", gap: "var(--qc-1)" }}>
              <Icon name="bolt" size={14} /> Energia
            </span>
            <span className="qc-num" style={{ fontSize: "var(--qc-t-small)", color: "var(--qc-ink-dim)" }}>
              {me.energy}/{me.energyMax}{energyFull ? " · plena" : ""}
            </span>
          </div>
          {/* Escala en comptes d'amplada, com la barra de temps: animar `width` obliga a
              recalcular el layout a cada fotograma. */}
          <div className="qc-meter">
            <div className="qc-meter__fill" style={{ transform: `scaleX(${energyPct / 100})` }} />
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--qc-1)" }}>
            <span className="qc-label">Nivell de repte · {me.skillLabel}</span>
            <span className="qc-num" style={{ fontSize: "var(--qc-t-small)", color: "var(--qc-ink-dim)" }}>
              {me.skill.toFixed(1)}/5
            </span>
          </div>
          <div className="qc-meter">
            <div className="qc-meter__fill" style={{ transform: `scaleX(${skillPct / 100})`, background: "var(--qc-sci)" }} />
          </div>
        </div>
      </div>

      {/* ── Graella d'emissió: què pots jugar ara ── */}
      <div style={{ display: "grid", gap: "var(--qc-2)" }}>
        <Mode
          title="Partida ràpida" line={`8 rondes · ${diffLabel}`} icon="play"
          field="var(--qc-amber)" onClick={() => props.onPlay("solo", difficulty)}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--qc-2)" }}>
          <Mode
            title="Survival" line="Fins que falles" icon="skull"
            field="var(--qc-live)" dark onClick={() => props.onPlay("survival", "adaptive")}
          />
          <Mode
            title="Repte diari" line="El mateix per a tothom" icon="calendar"
            field="var(--qc-geo)" onClick={() => props.onPlay("daily", "normal")}
          />
        </div>
        <Mode
          title="Memory" icon="puzzle" dark
          line={energyFull ? "Gasta l'energia i guanya crèdits" : `Necessites ${me.minigameCost} d'energia (en tens ${me.energy})`}
          field={energyFull ? "var(--qc-stage-3)" : "var(--qc-stage-2)"}
          disabled={!energyFull} onClick={props.onMinigame}
        />
      </div>

      {/* Secundari: no competeix amb els modes */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--qc-2)", marginTop: "var(--qc-4)" }}>
        <button className="qc-btn" style={{ flex: "1 1 45%" }} onClick={props.onPremium}>
          <Icon name="cart" size={18} /> Botiga
        </button>
        <button className="qc-btn" style={{ flex: "1 1 45%" }} onClick={props.onLeaderboard}>
          <Icon name="trophy" size={18} /> Rànquing
        </button>
        <button className="qc-btn" style={{ flex: "1 1 45%" }} onClick={props.onSubmit}>
          <Icon name="plus" size={18} /> Proposa
        </button>
        <button className="qc-btn" style={{ flex: "1 1 45%" }} onClick={props.onReview}>
          <Icon name="search" size={18} /> Revisa
        </button>
        {me.role === "admin" && (
          <button className="qc-btn" style={{ flex: "1 1 100%" }} onClick={props.onAdmin}>
            <Icon name="tools" size={18} /> Modera
          </button>
        )}
      </div>

      {me.achievements.length > 0 && (
        <div style={{ marginTop: "var(--qc-6)" }}>
          <h2 className="qc-label" style={{ marginBottom: "var(--qc-2)" }}>Assoliments</h2>
          <div style={{ display: "flex", gap: "var(--qc-2)", flexWrap: "wrap" }}>
            {me.achievements.map((a) => (
              <span key={a.slug} style={{
                display: "inline-flex", alignItems: "center", gap: "var(--qc-1)",
                padding: "var(--qc-1) var(--qc-3)", border: "1px solid var(--qc-hairline)",
                borderRadius: 999, fontSize: "var(--qc-t-small)", color: "var(--qc-ink-dim)",
              }}>
                <Icon name="star" size={14} /> {a.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {showSettings && (
        <div
          onClick={() => setShowSettings(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(6, 10, 16, .72)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 50, padding: "var(--qc-4)",
          }}
        >
          <div className="qc-panel" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420, width: "100%", maxHeight: "86vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--qc-4)" }}>
              <h2 style={{ fontSize: "1.25rem" }}>Configuració</h2>
              <button className="qc-btn qc-btn--ghost" style={{ minHeight: 40, padding: "var(--qc-2)" }}
                onClick={() => setShowSettings(false)}>
                <Icon name="cross" size={18} label="Tanca" />
              </button>
            </div>
            <div className="qc-label" style={{ marginBottom: "var(--qc-2)" }}>Dificultat de la partida ràpida</div>
            <div style={{ display: "flex", gap: "var(--qc-2)", flexWrap: "wrap", marginBottom: "var(--qc-2)" }}>
              {DIFFICULTIES.map((d) => (
                <button key={d.key} onClick={() => chooseDifficulty(d.key)}
                  className={`qc-btn${difficulty === d.key ? " qc-btn--primary" : ""}`}
                  style={{ minHeight: 40, padding: "var(--qc-2) var(--qc-4)" }}>
                  {d.label}
                </button>
              ))}
            </div>
            <p style={{ margin: "0 0 var(--qc-5)", fontSize: "var(--qc-t-small)", color: "var(--qc-ink-dim)" }}>
              {DIFFICULTIES.find((d) => d.key === difficulty)!.hint}
            </p>
            {/* El radar va AQUÍ i no a la pantalla principal, per decisió de producte: hi
                ha gent que es pot sentir avaluada, i el joc no vol ser un examen
                (`decisions.md`). Just abans del selector de temàtiques, que és amb el que
                es fa alguna cosa amb el que t'ensenya. */}
            <div style={{ borderTop: "1px solid var(--qc-hairline)", paddingTop: "var(--qc-4)" }}>
              <SkillRadar />
            </div>
            <div style={{ borderTop: "1px solid var(--qc-hairline)", paddingTop: "var(--qc-4)", marginTop: "var(--qc-4)" }}>
              <TopicsConfig />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
