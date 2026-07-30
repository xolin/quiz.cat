import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { GeoMap } from "../components/GeoMap.js";
import { AudioClip } from "../components/AudioClip.js";
import { Mascot } from "../components/Mascot.js";
import { Icon } from "../components/Icon.js";
import { CATEGORY_COLOR, CATEGORY_ICON } from "../components/iconArt.js";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * Panells de resposta. Cada panell porta pestanya de lletra: en revelar-se, el color
 * s'inunda i la pestanya canvia a ✓ o ✗, perquè el color no sigui l'únic indicador.
 *
 * Dues columnes només si TOTES les opcions són curtes: hi ha respostes com «Castella-la
 * Manxa» o noms científics binomials que en una graella 2×2 es partirien en tres línies.
 */
function OptionGrid(props: {
  options: Array<{ id: string; text: string }>;
  feedback: boolean;
  correctId: string | null;
  chosenId: string | null;
  busy: boolean;
  onPick: (id: string) => void;
}) {
  // Segona porta de les dues columnes: quatre opcions curtes. La primera és la media query
  // de `.qc-options--split` a styles.css, que és qui garanteix que hi hagi amplada.
  const split = props.options.length === 4 && props.options.every((o) => o.text.length <= 18);
  return (
    <div className={`qc-options qc-lit${split ? " qc-options--split" : ""}`}>
      {props.options.map((o, i) => {
        const isCorrect = props.correctId === o.id;
        const isMine = props.chosenId === o.id;
        const state = !props.feedback
          ? isMine ? "picked" : "idle"
          : isCorrect ? "good" : isMine ? "bad" : "dim";
        return (
          <button
            key={o.id}
            className={`qc-option${state === "bad" ? " qc-wrong" : ""}`}
            data-state={state}
            disabled={props.busy || props.feedback}
            onClick={() => props.onPick(o.id)}
          >
            <span className="qc-option__tab">
              {state === "good" ? <Icon name="check" size={18} />
                : state === "bad" ? <Icon name="cross" size={18} />
                : LETTERS[i]}
            </span>
            <span className="qc-option__label">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Marc de mèdia: la gramàtica comuna de les nou mecàniques. El peu porta la instrucció. */
function Media(props: { instruction: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="qc-media">
      <div className="qc-media__body">{props.children}</div>
      <div className="qc-media__caption">
        <span>{props.instruction}</span>
        {props.right}
      </div>
    </div>
  );
}

interface RoundView {
  index: number;
  total: number | null; // null = survival: no se sap quantes rondes hi haurà
  timeLimitMs: number;
  typeSlug: string;
  prompt: string | null;
  payload: any;
  category: { slug: string; name: string; icon: string | null } | null;
}

interface AnswerFeedback {
  isCorrect: boolean;
  expired: boolean;
  questionId: string;
  correctAnswer: any;
  points: { base: number; speedBonus: number; streakBonus: number; total: number };
  score: number;
  finished: boolean;
  streak: number | null; // survival: rondes superades
  progression: any;
}

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: "Tria la resposta",
  map_guess: "Clica al mapa",
  audio_clip: "Escolta i tria",
  image_guess: "Foto misteriosa",
  ordering: "Ordena-ho",
  higher_lower: "Més o menys?",
  estimation: "Estima-ho",
  timeline: "Cronologia",
  silhouette: "Silueta",
};

/** Temps que el toast queda visible abans d'avançar sol. */
function toastMs(typeSlug: string, fb: AnswerFeedback): number {
  if (typeSlug === "map_guess") return 2800; // temps de veure els dos marcadors
  if (typeSlug === "image_guess") return 2000; // temps de veure la imatge revelada
  if (typeSlug === "higher_lower") return 2000; // temps de veure el valor revelat
  if (typeSlug === "estimation") return 2400; // temps de veure com de a prop has quedat
  if (typeSlug === "timeline") return 3000; // temps de veure la línia de temps amb els anys
  if (typeSlug === "silhouette") return 2200; // temps de veure la silueta sencera
  if (typeSlug === "audio_clip") return 2400; // temps de llegir la varietat correcta
  if (!fb.isCorrect) return 2400; // temps de llegir la resposta correcta
  return 1400;
}

export function Game(props: { matchId: string; onFinished: (progression: any) => void; onAbandon: () => void }) {
  const [round, setRound] = useState<RoundView | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [mapPick, setMapPick] = useState<{ lat: number; lng: number } | null>(null);
  const [orderPicks, setOrderPicks] = useState<string[]>([]);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<number | null>(null);
  const advanceRef = useRef<number | null>(null);
  const submittedRef = useRef(false);
  const feedbackRef = useRef<AnswerFeedback | null>(null);

  const loadRound = useCallback(async () => {
    setFeedback(null);
    feedbackRef.current = null;
    setChosenId(null);
    setMapPick(null);
    setOrderPicks([]);
    setEstimate(null);
    submittedRef.current = false;
    const r = await api<{ finished: boolean; round?: RoundView }>(`/matches/${props.matchId}/round`);
    if (r.finished || !r.round) {
      props.onFinished(null);
      return;
    }
    setRound(r.round);
    setRemaining(r.round.timeLimitMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.matchId]);

  useEffect(() => {
    loadRound();
    return () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadRound]);

  // Compte enrere del client (el servidor és l'àrbitre real, amb 2s de gràcia).
  useEffect(() => {
    if (!round || feedback) return;
    const startedAt = Date.now();
    const limit = remaining;
    timerRef.current = window.setInterval(() => {
      const left = limit - (Date.now() - startedAt);
      setRemaining(Math.max(0, left));
      if (left <= 0 && !submittedRef.current) {
        submit(null);
      }
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, feedback]);

  function advance() {
    if (advanceRef.current) clearTimeout(advanceRef.current);
    const fb = feedbackRef.current;
    if (!fb) return;
    if (fb.finished) props.onFinished(fb.progression);
    else loadRound();
  }

  async function submit(given: unknown) {
    if (submittedRef.current || busy) return;
    submittedRef.current = true;
    setBusy(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const fb = await api<AnswerFeedback>(`/matches/${props.matchId}/answer`, {
        method: "POST",
        body: { given },
      });
      setFeedback(fb);
      feedbackRef.current = fb;
      setScore(fb.score);
      setCombo((c) => (fb.isCorrect ? c + 1 : 0));
      // Auto-avanç: res a clicar, el joc segueix sol.
      advanceRef.current = window.setTimeout(advance, toastMs(round!.typeSlug, fb));
    } finally {
      setBusy(false);
    }
  }

  if (!round) return <p className="qc-screen">Carregant…</p>;

  const pct = Math.round((100 * remaining) / round.timeLimitMs);
  // Survival: el servidor no envia total; la ratxa és l'índex, perquè un error acaba la tirada.
  const survival = round.total === null;
  const low = !feedback && pct <= 27;
  const correctId: string | null = feedback?.correctAnswer?.correctId ?? null;
  const catSlug = round.category?.slug ?? "";
  const seconds = Math.ceil(remaining / 1000);

  function correctAnswerText(fb: AnswerFeedback): string {
    const t = fb.correctAnswer;
    if (t?.correctId && round?.payload?.options) {
      return round.payload.options.find((o: any) => o.id === t.correctId)?.text ?? "";
    }
    if (t?.order && round?.payload?.items) {
      return t.order.map((id: string) => round.payload.items.find((it: any) => it.id === id)?.text).join(" → ");
    }
    if (t?.tolerancePct !== undefined) return `${t.value} ${round?.payload?.unit ?? ""}`;
    if (t?.accepted) return t.accepted[0];
    return "";
  }

  const options: Array<{ id: string; text: string }> = round.payload.options ?? [];
  const items: Array<{ id: string; text: string }> = round.payload.items ?? [];
  const pick = (id: string) => { setChosenId(id); submit({ choiceId: id }); };

  return (
    <div className="qc-screen">
      {/* TOAST de resultat: apareix a dalt, no bloqueja, auto-avança (clica per saltar). */}
      {feedback && (
        <div
          className={`qc-toast ${feedback.isCorrect ? "qc-toast--good" : "qc-toast--bad"}`}
          onClick={advance}
          role="status"
          aria-live="polite"
          /* L'auto-avanç s'atura mentre hi ets a sobre, per si vols llegir la resposta
             correcta amb calma. No és el camí per a la valoració de la pregunta: al mòbil
             no hi ha `mouseenter` i el dit no arriba a temps. Això viu al resum. */
          onMouseEnter={() => { if (advanceRef.current) clearTimeout(advanceRef.current); }}
          onFocus={() => { if (advanceRef.current) clearTimeout(advanceRef.current); }}
          style={{ cursor: "pointer", textAlign: "center" }}
        >
          <div style={{ display: "flex", gap: "var(--qc-4)", alignItems: "center", justifyContent: "center" }}>
            {/* KO només al survival, on l'error acaba la tirada; si no, decebut i endavant. */}
            <Mascot size={56} mood={feedback.isCorrect ? "content" : survival ? "ko" : "trist"} />
            <b className="qc-num" style={{ fontSize: "2rem", lineHeight: 1 }}>
              {feedback.expired ? "Temps esgotat" : feedback.isCorrect ? `+${feedback.points.total}` : "Incorrecte"}
            </b>
          </div>
          {feedback.isCorrect && (feedback.points.speedBonus > 0 || feedback.points.streakBonus > 0) && (
            <div style={{ fontSize: "var(--qc-t-small)", marginTop: "var(--qc-2)", opacity: 0.9 }}>
              rapidesa +{feedback.points.speedBonus} · ratxa +{feedback.points.streakBonus}
            </div>
          )}
          {!feedback.isCorrect && !!correctAnswerText(feedback) && (
            <div style={{ marginTop: "var(--qc-2)" }}>Era: <b>{correctAnswerText(feedback)}</b></div>
          )}
          {/* Survival: un error acaba la tirada, i s'ha de veure que ha estat aquí. */}
          {survival && !feedback.isCorrect && (
            <div style={{ marginTop: "var(--qc-2)", fontWeight: 700 }}>
              Fi de la tirada · has arribat a {feedback.streak ?? round.index}
            </div>
          )}
        </div>
      )}

      {/* ── Tira de control: rètol de secció + comptador ── */}
      <div className="qc-strip">
        <div className="qc-lower-third" style={{ ["--qc-section" as string]: CATEGORY_COLOR[catSlug] }}>
          <span className="qc-lower-third__section">
            {CATEGORY_ICON[catSlug] && <Icon name={CATEGORY_ICON[catSlug]} size={16} />}
            {round.category?.name ?? "quiz.cat"}
          </span>
          <span className="qc-lower-third__meta">
            <span>
              Ronda <b className="qc-num">{round.index + 1}</b>{round.total ? `/${round.total}` : ""}
            </span>
            <span>
              {TYPE_LABEL[round.typeSlug] ?? round.typeSlug}
            </span>
          </span>
        </div>
        <div className={`qc-counter${low ? " qc-counter--low" : ""}`} role="timer"
          aria-label={feedback ? "temps aturat" : `${seconds} segons`}>
          <b className="qc-num qc-counter__value">{feedback ? "—" : String(seconds).padStart(2, "0")}</b>
          {!feedback && <span className="qc-counter__unit">s</span>}
        </div>
      </div>

      <div className={`qc-timer${low ? " qc-timer--low" : ""}`}>
        {/* Escala en comptes d'amplada: el compte enrere es repinta cada 100 ms i animar
            `width` obligaria a recalcular el layout a cada tic. */}
        <div className="qc-timer__fill" style={{ transform: `scaleX(${feedback ? 0 : pct / 100})` }} />
      </div>

      <div className="qc-stagelight">
        <h1 className="qc-question">{round.prompt}</h1>
      </div>

      {/* ── Opció múltiple ── */}
      {round.typeSlug === "multiple_choice" && (
        <OptionGrid options={options} feedback={!!feedback} correctId={correctId} chosenId={chosenId} busy={busy} onPick={pick} />
      )}

      {/* ── Clip d'àudio: sona sol en començar la ronda i es pot repetir ── */}
      {round.typeSlug === "audio_clip" && (
        <>
          <Media instruction="Clip de veu">
            <AudioClip src={round.payload.audioUrl ?? round.payload.imageUrl} />
          </Media>
          <OptionGrid options={options} feedback={!!feedback} correctId={correctId} chosenId={chosenId} busy={busy} onPick={pick} />
        </>
      )}

      {/* ── Foto misteriosa: imatge amb blur que es revela amb el temps ── */}
      {round.typeSlug === "image_guess" && (
        <>
          <Media instruction="La imatge es va aclarint">
            <div style={{ overflow: "hidden", aspectRatio: "4 / 3", width: "100%", display: "flex", background: "#000" }}>
              <img
                src={round.payload.imageUrl}
                alt="foto misteriosa"
                style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  filter: `blur(${feedback ? 0 : Math.round((pct / 100) * 16) + 2}px)`,
                  transform: feedback ? "scale(1)" : "scale(1.08)", // amaga les vores borroses
                  transition: "filter 0.15s linear",
                }}
              />
            </div>
          </Media>
          <OptionGrid options={options} feedback={!!feedback} correctId={correctId} chosenId={chosenId} busy={busy} onPick={pick} />
        </>
      )}

      {/* ── Silueta: el contorn es descobreix d'esquerra a dreta a mesura que corre el temps ── */}
      {round.typeSlug === "silhouette" && (() => {
        // 0 = tot amagat, 1 = tot visible. Comença amb un tros descobert perquè no sigui un
        // quadre buit, i passa d'1 abans que s'acabi el temps perquè la vora dreta no quedi
        // mig esvaïda.
        const rev = 0.18 + 1.02 * (1 - pct / 100);
        const fill = feedback ? "var(--qc-amber)" : "var(--qc-ink-dim)";
        return (
          <>
            <Media instruction="El contorn es va descobrint">
              <svg
                viewBox={`0 0 ${round.payload.w} ${round.payload.h}`}
                role="img"
                aria-label="silueta per endevinar"
                style={{ width: "100%", maxWidth: 340, height: 220, padding: "var(--qc-3)" }}
              >
                <defs>
                  <linearGradient id="qc-sil-wipe" x1="0" y1="0" x2="1" y2="0">
                    <stop offset={Math.min(1, Math.max(0, rev - 0.12))} stopColor="#fff" />
                    <stop offset={Math.min(1, rev)} stopColor="#000" />
                  </linearGradient>
                  <mask id="qc-sil-mask">
                    <rect x={-1} y={-1} width={round.payload.w + 2} height={round.payload.h + 2} fill="url(#qc-sil-wipe)" />
                  </mask>
                </defs>
                {/* El contorn del mateix color tapa els fils que deixen les vores internes
                    (les comunitats són la unió de les seves províncies, no una forma sola). */}
                <path
                  d={round.payload.path}
                  fill={fill}
                  stroke={fill}
                  strokeWidth={0.5}
                  strokeLinejoin="round"
                  mask={feedback ? undefined : "url(#qc-sil-mask)"}
                />
              </svg>
            </Media>
            <OptionGrid options={options} feedback={!!feedback} correctId={correctId} chosenId={chosenId} busy={busy} onPick={pick} />
          </>
        );
      })()}

      {/* ── Més alt o més baix ── */}
      {round.typeSlug === "higher_lower" && (
        <>
          <Media instruction={`Compara la ${round.payload.metric}`}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", width: "100%" }}>
              <div style={{ padding: "var(--qc-4)", textAlign: "center", borderRight: "1px solid var(--qc-hairline)" }}>
                <div style={{ fontStretch: "80%", fontWeight: 700 }}>{round.payload.a.label}</div>
                <div className="qc-num" style={{ marginTop: "var(--qc-1)", fontSize: "1.25rem", color: "var(--qc-ink-dim)" }}>
                  {round.payload.a.display}
                </div>
              </div>
              <div style={{ padding: "var(--qc-4)", textAlign: "center" }}>
                <div style={{ fontStretch: "80%", fontWeight: 700 }}>{round.payload.b.label}</div>
                <div className="qc-num" style={{ marginTop: "var(--qc-1)", fontSize: "1.25rem", color: feedback ? "var(--qc-amber)" : "var(--qc-ink-dim)" }}>
                  {feedback ? feedback.correctAnswer.bDisplay : "?"}
                </div>
              </div>
            </div>
          </Media>
          <div className="qc-options qc-lit">
            {(["higher", "lower"] as const).map((choice) => {
              const isRight = feedback && (choice === "higher") === feedback.correctAnswer.bHigher;
              const isMine = chosenId === choice;
              const state = !feedback ? (isMine ? "picked" : "idle") : isRight ? "good" : isMine ? "bad" : "idle";
              return (
                <button key={choice} className="qc-option" data-state={state}
                  disabled={busy || !!feedback}
                  onClick={() => { setChosenId(choice); submit({ choice }); }}>
                  <span className="qc-option__tab">
                    {state === "good" ? <Icon name="check" size={18} />
                      : state === "bad" ? <Icon name="cross" size={18} />
                      : choice === "higher" ? "+" : "−"}
                  </span>
                  <span className="qc-option__label">
                    {choice === "higher" ? `Més ${round.payload.metric}` : `Menys ${round.payload.metric}`}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Mapa real ── */}
      {round.typeSlug === "map_guess" && (
        <>
          <Media instruction={mapPick ? "Confirma o torna a clicar" : "Clica el punt al mapa"}>
            <div style={{ width: "100%" }}>
              <GeoMap
                disabled={!!feedback}
                onPick={(lat, lng) => setMapPick({ lat, lng })}
                markers={[
                  ...(mapPick ? [{ ...mapPick, color: "#F0A044", label: feedback ? "tu" : undefined }] : []),
                  ...(feedback?.correctAnswer?.lat !== undefined
                    ? [{ lat: feedback.correctAnswer.lat, lng: feedback.correctAnswer.lng, color: "#3FBF7F", label: "correcte" }]
                    : []),
                ]}
              />
            </div>
          </Media>
          {!feedback && (
            <button className="qc-btn qc-btn--primary qc-btn--block" disabled={!mapPick || busy} onClick={() => submit(mapPick)}>
              Confirma la posició
            </button>
          )}
        </>
      )}

      {/* ── Ordena-ho: clica els elements en ordre ── */}
      {round.typeSlug === "ordering" && (
        <>
          <div className="qc-options qc-lit">
            {items.map((it) => {
              const pos = orderPicks.indexOf(it.id);
              return (
                <button
                  key={it.id}
                  className="qc-option"
                  data-state={pos !== -1 ? "picked" : "idle"}
                  disabled={busy || !!feedback || pos !== -1}
                  onClick={() => {
                    const next = [...orderPicks, it.id];
                    setOrderPicks(next);
                    if (next.length === items.length) submit({ order: next });
                  }}
                >
                  <span className="qc-option__tab">{pos !== -1 ? pos + 1 : "·"}</span>
                  <span className="qc-option__label">{it.text}</span>
                </button>
              );
            })}
          </div>
          <p className="qc-label" style={{ marginTop: "var(--qc-3)" }}>
            {round.payload.criterion ? `Ordre: ${round.payload.criterion}` : "Clica'ls en ordre"}
          </p>
          {orderPicks.length > 0 && !feedback && (
            <button className="qc-btn" onClick={() => setOrderPicks(orderPicks.slice(0, -1))}>
              <Icon name="undo" size={18} /> Desfés
            </button>
          )}
        </>
      )}

      {/* ── Cronologia: col·loca els fets a la línia de temps ── */}
      {round.typeSlug === "timeline" && (() => {
        const events: Array<{ id: string; text: string }> = round.payload.events ?? [];
        const years: Record<string, number> = feedback?.correctAnswer?.years ?? {};
        const correctOrder: string[] = feedback?.correctAnswer?.order ?? [];
        const fmtYear = (y: number) => (y < 0 ? `${-y} aC` : y === 0 ? "any 0" : `${y}`);
        const byId = (id: string) => events.find((e) => e.id === id);
        const wrong = feedback && orderPicks.join() !== correctOrder.join();
        return (
          <>
            <Media instruction="Del més antic al més recent">
              <div style={{ display: "flex", gap: 1, width: "100%" }}>
                {Array.from({ length: events.length }, (_, i) => {
                  const placedId = orderPicks[i];
                  const ev = placedId ? byId(placedId) : null;
                  const ok = feedback ? correctOrder[i] === placedId : null;
                  const bg = feedback
                    ? ok ? "var(--qc-good)" : "var(--qc-live)"
                    : ev ? "var(--qc-stage-3)" : "transparent";
                  return (
                    <div key={i} style={{
                      flex: "1 1 0", minWidth: 0, padding: "var(--qc-2)", background: bg, textAlign: "center",
                      fontSize: "var(--qc-t-small)", color: feedback ? (ok ? "var(--qc-ink-on-light)" : "#fff") : "var(--qc-ink)",
                    }}>
                      <div className="qc-num" style={{ fontSize: "var(--qc-t-label)", opacity: 0.7 }}>{i + 1}</div>
                      <div style={{ lineHeight: 1.2 }}>{ev ? ev.text : "—"}</div>
                      {feedback && placedId && (
                        <div className="qc-num" style={{ marginTop: "var(--qc-1)" }}>{fmtYear(years[placedId])}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Media>

            {!feedback && (
              <>
                <div className="qc-options qc-lit">
                  {events.filter((e) => !orderPicks.includes(e.id)).map((e) => (
                    <button key={e.id} className="qc-option" data-state="idle" disabled={busy}
                      onClick={() => {
                        const next = [...orderPicks, e.id];
                        setOrderPicks(next);
                        if (next.length === events.length) submit({ order: next });
                      }}>
                      <span className="qc-option__tab">·</span>
                      <span className="qc-option__label">{e.text}</span>
                    </button>
                  ))}
                </div>
                {orderPicks.length > 0 && (
                  <button className="qc-btn" style={{ marginTop: "var(--qc-3)" }}
                    onClick={() => setOrderPicks(orderPicks.slice(0, -1))}>
                    <Icon name="undo" size={18} /> Desfés
                  </button>
                )}
              </>
            )}
            {wrong && (
              <p style={{ marginTop: "var(--qc-3)", fontSize: "var(--qc-t-small)", color: "var(--qc-ink-dim)" }}>
                Correcte: {correctOrder.map((id) => `${byId(id)?.text} (${fmtYear(years[id])})`).join(" → ")}
              </p>
            )}
          </>
        );
      })()}

      {/* ── Estimació: slider (logarítmic si cal), sense escriure ── */}
      {round.typeSlug === "estimation" && (() => {
        const { min, max, step, unit, scale } = round.payload;
        const isLog = scale === "log";
        const K = 5; // corba del logarítmic
        const posToVal = (t: number) => {
          const raw = isLog ? min + (max - min) * ((Math.exp(K * t) - 1) / (Math.exp(K) - 1)) : min + (max - min) * t;
          return Math.round(raw / step) * step;
        };
        const valToPos = (v: number) => {
          if (!isLog) return (v - min) / (max - min);
          return Math.log(1 + ((v - min) / (max - min)) * (Math.exp(K) - 1)) / K;
        };
        const val = estimate ?? posToVal(0.5);
        const real = feedback?.correctAnswer.value;
        const proximity = feedback && real != null
          ? Math.max(0, Math.round(100 * (1 - Math.abs(val - real) / Math.max(1, Math.abs(real))))) : null;
        return (
          <>
            <Media instruction={`Estimació en ${unit}`} right={feedback ? <span>real: {real?.toLocaleString("ca")}</span> : undefined}>
              <div style={{ width: "100%", padding: "var(--qc-4)" }}>
                <div style={{ textAlign: "center" }}>
                  <span key={val} className="qc-num qc-bump" style={{ fontSize: "var(--qc-t-score)" }}>
                    {val.toLocaleString("ca")}
                  </span>
                </div>
                <input type="range" min={0} max={1000} step={1}
                  aria-label={`Estimació en ${unit}`}
                  value={Math.round(valToPos(val) * 1000)} disabled={busy || !!feedback}
                  onChange={(e) => setEstimate(posToVal(Number(e.target.value) / 1000))}
                  style={{ width: "100%", marginTop: "var(--qc-3)" }} />
                <div className="qc-num" style={{ display: "flex", justifyContent: "space-between", color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-label)" }}>
                  <span>{min.toLocaleString("ca")}</span><span>{max.toLocaleString("ca")}</span>
                </div>
              </div>
            </Media>
            {feedback ? (
              <p style={{ margin: 0 }}>
                Real: <b className="qc-num">{real?.toLocaleString("ca")} {unit}</b> · la teva: <span className="qc-num">{val.toLocaleString("ca")}</span>
                {proximity != null && (
                  <> · <b className="qc-num" style={{ color: proximity >= 70 ? "var(--qc-good)" : "var(--qc-live-text)" }}>a {proximity}%</b></>
                )}
              </p>
            ) : (
              <button className="qc-btn qc-btn--primary qc-btn--block" onClick={() => submit({ value: val })}>Confirma</button>
            )}
          </>
        );
      })()}

      {/* ── Marcador ── */}
      <div className="qc-scoreboard" style={{ marginTop: "var(--qc-5)" }}>
        <div className="qc-scoreboard__cell">
          <span className="qc-scoreboard__label">Punts</span>
          <span key={score} className="qc-scoreboard__value qc-num qc-bump">{score.toLocaleString("ca")}</span>
        </div>
        {survival ? (
          <div className="qc-scoreboard__cell">
            <span className="qc-scoreboard__label">Superades</span>
            <span className="qc-scoreboard__value qc-num" style={{ color: "var(--qc-live-text)" }}>{round.index}</span>
          </div>
        ) : (
          <div className="qc-scoreboard__cell">
            <span className="qc-scoreboard__label">Ratxa</span>
            <span className="qc-scoreboard__value qc-num" style={{ color: combo >= 2 ? "var(--qc-amber)" : undefined }}>
              {combo}
            </span>
          </div>
        )}
      </div>

      <p style={{ marginTop: "var(--qc-5)", textAlign: "center" }}>
        <a href="#"
          onClick={(e) => { e.preventDefault(); api(`/matches/${props.matchId}/abandon`, { method: "POST" }).then(props.onAbandon); }}
          style={{ color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)" }}>
          Abandona la partida
        </a>
      </p>
    </div>
  );
}
