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
  // Puja cada cop que la pestanya canvia de visibilitat: és el que rearrenca el compte enrere.
  const [awake, setAwake] = useState(0);
  // Un enviament que ha fallat per xarxa. Mentre hi sigui, la ronda ofereix reintentar.
  const [sendError, setSendError] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const timerRef = useRef<number | null>(null);
  const advanceRef = useRef<number | null>(null);
  const submittedRef = useRef(false);
  const feedbackRef = useRef<AnswerFeedback | null>(null);
  // Hi ha una ronda demanada i encara no arribada. Mentre duri, el compte enrere no pot
  // córrer: el que es pinta és la ronda anterior i el temps encara no és de ningú.
  const loadingRef = useRef(false);
  const questionRef = useRef<HTMLHeadingElement>(null);

  const loadRound = useCallback(async () => {
    loadingRef.current = true;
    setFeedback(null);
    feedbackRef.current = null;
    setChosenId(null);
    setMapPick(null);
    setOrderPicks([]);
    setEstimate(null);
    const r = await api<{ finished: boolean; round?: RoundView }>(`/matches/${props.matchId}/round`);
    if (r.finished || !r.round) {
      props.onFinished(null);
      return;
    }
    // El desbloqueig va DESPRÉS de la xarxa, no abans: entre que es neteja el feedback i
    // arriba la ronda nova hi ha un forat, i deixar-lo obert permetia enviar una resposta
    // contra una ronda que encara no existia a la pantalla.
    submittedRef.current = false;
    loadingRef.current = false;
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

  // El focus va a la pregunta a cada ronda nova. Només quan canvia la RONDA: fer-ho a cada
  // repintat robaria el focus mentre el jugador navega les opcions.
  useEffect(() => {
    if (round && !feedback) questionRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.index]);

  // Compte enrere del client (el servidor és l'àrbitre real, amb 2s de gràcia).
  //
  // Es PAUSA quan la pestanya s'amaga. Sense això el rellotge és de paret i segueix corrent
  // mentre mires si arriba el bus o t'entra una notificació: tornaves a una ronda ja fallada
  // sola. El públic d'aquest joc juga en estones mortes i s'interromp — la interrupció no és
  // un cas extrem, és l'escena d'ús. I no obre cap forat: el servidor segueix sent l'àrbitre
  // i ja dona 2 s de gràcia sobre un límit que el client no decideix.
  useEffect(() => {
    if (!round || feedback || loadingRef.current) return;
    if (document.visibilityState === "hidden") return; // ja es rearrencarà en tornar
    const startedAt = Date.now();
    // El límit surt de la RONDA i no de `remaining`. En netejar el feedback per carregar la
    // següent, `remaining` encara valia 0 de la ronda caducada: el comptador arrencava ja
    // exhaurit i fallava tot sol una ronda que el jugador no havia arribat a veure.
    // En reprendre després d'una pausa, el que queda és `remaining`, no el límit sencer.
    const limit = remaining > 0 ? remaining : round.timeLimitMs;
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
  }, [round, feedback, awake]);

  // En amagar-se, congela el temps restant; en tornar, `awake` canvia i l'efecte de dalt
  // rearrenca el compte des d'on s'havia quedat.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        if (timerRef.current) clearInterval(timerRef.current);
      }
      setAwake((n) => n + 1);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  function advance() {
    if (advanceRef.current) clearTimeout(advanceRef.current);
    const fb = feedbackRef.current;
    if (!fb) return;
    if (fb.finished) props.onFinished(fb.progression);
    else loadRound();
  }

  /** L'última resposta enviada, per poder reintentar-la sense fer endevinar res al jugador. */
  const lastGivenRef = useRef<unknown>(undefined);

  async function submit(given: unknown) {
    if (submittedRef.current || busy) return;
    submittedRef.current = true;
    lastGivenRef.current = given;
    setBusy(true);
    setSendError(false);
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
    } catch {
      // Sense això, la ronda quedava MORTA: `api()` llança, no arribava cap feedback, per
      // tant cap toast i cap auto-avanç, i com que `submittedRef` es quedava a cert el camí
      // de caducitat tampoc reintentava. Pantalla congelada i muda, amb l'única sortida
      // d'abandonar la partida. I passava justament a l'escena d'ús que el producte descriu:
      // al transport, on els túnels i els canvis de cel·la són la norma.
      submittedRef.current = false;
      setSendError(true);
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setSendError(false);
    submit(lastGivenRef.current);
  }

  if (!round) return <p className="qc-screen">Carregant…</p>;

  const pct = Math.round((100 * remaining) / round.timeLimitMs);
  // Survival: el servidor no envia total; la ratxa és l'índex, perquè un error acaba la tirada.
  const survival = round.total === null;
  // ABSOLUT i no percentual. Amb el 27% del límit, als 15 s saltava a 4,05 s —correcte— però
  // als 6 s del survival saltava a 1,62 s, quan la decisió ja està perduda. Al mode construït
  // sencer al voltant de la pressió del temps, el millor senyal de la pantalla no arribava.
  const low = !feedback && remaining <= 4000;
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
    // Amb separador de milers, com la resta de xifres de la pantalla: al toast sortia
    // «Era: 35926 habitants» just a sobre d'un «35.926» del marc de mèdia.
    if (t?.tolerancePct !== undefined) {
      return `${Number(t.value).toLocaleString("ca")} ${round?.payload?.unit ?? ""}`.trim();
    }
    if (t?.accepted) return t.accepted[0];
    return "";
  }

  const options: Array<{ id: string; text: string }> = round.payload.options ?? [];
  const items: Array<{ id: string; text: string }> = round.payload.items ?? [];
  const pick = (id: string) => { setChosenId(id); submit({ choiceId: id }); };

  return (
    <div className="qc-screen">
      {/* Escombrada de canvi de ronda: la transició natiu d'una retransmissió. Creua la
          pantalla amb el color de la categoria que entra. `key` per ronda perquè React el
          recreï i l'animació torni a començar; sota `prefers-reduced-motion` no es dibuixa. */}
      <span key={`sweep-${round.index}`} className="qc-sweep" aria-hidden="true"
        style={{ ["--qc-section" as string]: CATEGORY_COLOR[catSlug] ?? "var(--qc-stage-3)" }} />

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
        {/* `role="timer"` implica `aria-live: off`: l'etiqueta canviava cada 100 ms i no
            s'anunciava mai res, o sigui que amb lector de pantalla no tenies CAP informació
            de pressió temporal en un rellotge de 15 segons. Ara s'anuncia, però no a cada
            segon —seria insuportable— sinó als llindars que canvien la decisió, via la
            regió viva de sota. */}
        <div className={`qc-counter${low ? " qc-counter--low" : ""}`} role="timer"
          aria-label={feedback ? "temps aturat" : `${seconds} segons`}>
          <b className="qc-num qc-counter__value">{feedback ? "—" : String(seconds).padStart(2, "0")}</b>
          {!feedback && <span className="qc-counter__unit">s</span>}
        </div>
        <span className="qc-sr" role="status" aria-live="assertive">
          {!feedback && low ? "Últims segons" : ""}
        </span>
      </div>

      <div className={`qc-timer${low ? " qc-timer--low" : ""}`}>
        {/* Escala en comptes d'amplada: el compte enrere es repinta cada 100 ms i animar
            `width` obligaria a recalcular el layout a cada tic. */}
        <div className="qc-timer__fill" style={{ transform: `scaleX(${feedback ? 0 : pct / 100})` }} />
      </div>

      {/* Mentre es veu el resultat, un clic a QUALSEVOL lloc avança. Ha d'anar aquí fora i
          no dins de `.qc-stagelight`: aquell té `isolation: isolate`, i des de dins cap
          `z-index` no pot superar el mapa de Leaflet, que és qui es quedava els clics. */}
      {feedback && <button type="button" className="qc-skip" aria-label="Continua" onClick={advance} />}

      {/* Un enviament que no ha arribat. Ocupa el lloc del toast i el seu camp d'error, i
          diu QUÈ ha passat i què pots fer: abans això era una pantalla congelada i muda. */}
      {sendError && (
        <div className="qc-stagelight">
          <div className="qc-toast qc-toast--bad" role="alert" style={{ textAlign: "center" }}>
            <div style={{ display: "flex", gap: "var(--qc-4)", alignItems: "center", justifyContent: "center" }}>
              <Mascot size={56} mood="trist" />
              <b className="qc-num" style={{ fontSize: "var(--qc-t-score)", lineHeight: 1 }}>Sense connexió</b>
            </div>
            <div style={{ marginTop: "var(--qc-2)" }}>La resposta no ha arribat. El temps està aturat.</div>
            <button className="qc-btn qc-btn--block" style={{ marginTop: "var(--qc-3)" }} onClick={retry}>
              <Icon name="replay" size={18} /> Torna-ho a provar
            </button>
          </div>
        </div>
      )}

      <div className="qc-stagelight">
        {/* TOAST de resultat: substitueix la pregunta, no s'hi posa a sobre.
            Sura't absolut i podia fer 200px quan la pregunta en feia 50, o sigui que la
            resta vessava cap avall i tapava el que vingués — el panell de la resposta
            correcta, la silueta, o el número de l'estimació (text sobre text). Al flux i
            al lloc de la pregunta, la intenció es manté —quan hi ha resultat ja no has de
            llegir l'enunciat— i no pot trepitjar res per construcció. */}
        {feedback ? (
          <div
            className={`qc-toast ${feedback.isCorrect ? "qc-toast--good" : "qc-toast--bad"}`}
            role="status"
            aria-live="polite"
            /* Abans, el `mouseenter` aturava l'auto-avanç per poder llegir la resposta amb
               calma — però no el tornava a armar mai, o sigui que amb el punter a sobre la
               ronda es quedava congelada per sempre. La lectura amb calma viu al resum. */
            style={{ textAlign: "center" }}
          >
            <div style={{ display: "flex", gap: "var(--qc-4)", alignItems: "center", justifyContent: "center" }}>
              {/* KO només al survival, on l'error acaba la tirada; si no, decebut i endavant. */}
              <Mascot size={56} mood={feedback.isCorrect ? "content" : survival ? "ko" : "trist"} />
              <b className="qc-num" style={{ fontSize: "var(--qc-t-score)", lineHeight: 1 }}>
                {feedback.expired ? "S'ha acabat el temps" : feedback.isCorrect ? `+${feedback.points.total}` : "No hi era"}
              </b>
            </div>
            {/* Ordenació i cronologia perdonen un intercanvi de veïns i ho paguen amb menys
                punts. Cal dir-ho: si no, el toast diria "correcte" mentre la tira ensenya
                dues caselles vermelles i sembla que el joc s'equivoqui. */}
            {feedback.isCorrect && feedback.points.base < 100
              && (round.typeSlug === "ordering" || round.typeSlug === "timeline") && (
              <div style={{ marginTop: "var(--qc-2)" }}>Gairebé: en tenies dos de canviats</div>
            )}
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
        ) : (
          /* `tabIndex={-1}` + focus programàtic: en canviar de ronda l'`h1` se substituïa
             sense anunciar res i el botó enfocat es desmuntava, deixant el focus al `<body>`.
             Amb lector de pantalla i teclat, cada ronda començava amb una cerca a cegues amb
             `Tab` sota un rellotge de 15 segons. Ara el focus aterra a la pregunta, que és
             on comença la lectura, i la regió viva l'anuncia. */
          <h1 className="qc-question" ref={questionRef} tabIndex={-1} aria-live="polite">
            {round.prompt}
          </h1>
        )}
      </div>

      {/* ── Opció múltiple ── */}
      {round.typeSlug === "multiple_choice" && (
        <OptionGrid options={options} feedback={!!feedback} correctId={correctId} chosenId={chosenId} busy={busy} onPick={pick} />
      )}

      {/* ── Clip d'àudio: sona sol en començar la ronda i es pot repetir ── */}
      {round.typeSlug === "audio_clip" && (
        <>
          <Media instruction={feedback ? "El clip, sencer" : "Escolta i tria"}>
            <AudioClip src={round.payload.audioUrl ?? round.payload.imageUrl} />
          </Media>
          <OptionGrid options={options} feedback={!!feedback} correctId={correctId} chosenId={chosenId} busy={busy} onPick={pick} />
        </>
      )}

      {/* ── Foto misteriosa: imatge amb blur que es revela amb el temps ── */}
      {round.typeSlug === "image_guess" && (
        <>
          {/* El crèdit surt en revelar-se la foto, no abans: mentre penses no ha de competir
              amb res, però la majoria d'imatges són CC BY-SA i acreditar l'autor no és opcional. */}
          <Media
            instruction={feedback ? "La foto, revelada" : "La imatge es va aclarint"}
            right={feedback && round.payload.credit ? (
              <a className="qc-media__credit" href={round.payload.creditUrl}
                target="_blank" rel="noreferrer noopener">
                {round.payload.credit}
              </a>
            ) : undefined}
          >
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
            <Media instruction={feedback ? "El contorn, sencer" : "El contorn es va descobrint"}>
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
          <Media instruction={feedback ? `Comparat amb ${round.payload.a.label}` : `${round.payload.b.label} contra ${round.payload.a.label}`}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", width: "100%" }}>
              <div style={{ padding: "var(--qc-4)", textAlign: "center", borderRight: "1px solid var(--qc-hairline)" }}>
                <div style={{ fontStretch: "78%", fontWeight: 700 }}>{round.payload.a.label}</div>
                <div className="qc-num" style={{ marginTop: "var(--qc-1)", fontSize: "var(--qc-t-title)", color: "var(--qc-ink-dim)" }}>
                  {round.payload.a.display}
                </div>
              </div>
              <div style={{ padding: "var(--qc-4)", textAlign: "center" }}>
                <div style={{ fontStretch: "78%", fontWeight: 700 }}>{round.payload.b.label}</div>
                <div className="qc-num" style={{ marginTop: "var(--qc-1)", fontSize: "var(--qc-t-title)", color: feedback ? "var(--qc-amber)" : "var(--qc-ink-dim)" }}>
                  {feedback ? feedback.correctAnswer.bDisplay : "?"}
                </div>
              </div>
            </div>
          </Media>
          <div className="qc-options qc-lit">
            {(["higher", "lower"] as const).map((choice) => {
              const isRight = feedback && (choice === "higher") === feedback.correctAnswer.bHigher;
              const isMine = chosenId === choice;
              const state = !feedback ? (isMine ? "picked" : "idle") : isRight ? "good" : isMine ? "bad" : "dim";
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
                    {`${round.payload.b.label} té ${choice === "higher" ? "més" : "menys"} ${round.payload.metric}`}
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
          <Media instruction={feedback ? "La teva marca i la correcta" : mapPick ? "Confirma o torna a clicar" : "Clica el punt al mapa"}>
            <div style={{ width: "100%" }}>
              <GeoMap
                disabled={!!feedback}
                onPick={(lat, lng) => setMapPick({ lat, lng })}
                center={round.payload.center}
                zoom={round.payload.zoom}
                maxZoom={round.payload.maxZoom}
                bounds={round.payload.bounds}
                markers={[
                  ...(mapPick ? [{ ...mapPick, color: "var(--qc-amber)", label: feedback ? "tu" : undefined }] : []),
                  ...(feedback?.correctAnswer?.lat !== undefined
                    ? [{ lat: feedback.correctAnswer.lat, lng: feedback.correctAnswer.lng, color: "var(--qc-good)", label: "correcte" }]
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
          <p className="qc-label" style={{ margin: "0 0 var(--qc-3)" }}>
            {round.payload.criterion ? `Ordre: ${round.payload.criterion}` : "Clica'ls en ordre"}
          </p>
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
            <Media instruction={feedback ? "Amb els anys de cada fet" : "Del més antic al més recent"}>
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
                      fontSize: "var(--qc-t-small)",
                      color: feedback ? (ok ? "var(--qc-ink-on-light)" : "var(--qc-ink)") : "var(--qc-ink)",
                    }}>
                      {/* El número de posició porta el GLIF al costat quan hi ha resultat.
                          Fins ara aquesta era l'única mecànica que deia encert i error només
                          amb color, i justament on el veredicte per casella ÉS tot el
                          feedback: qui no distingeix el verd del roig no en llegia res. El
                          component d'opció, del mateix autor, ja porta ✓ i ✗ a la pestanya. */}
                      <div className="qc-num" style={{
                        fontSize: "var(--qc-t-label)", opacity: 0.85,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--qc-1)",
                      }}>
                        {feedback && <Icon name={ok ? "check" : "cross"} size={12} />}
                        {i + 1}
                      </div>
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
                  /* Sense això el lector canta la POSICIÓ de la pista (0-1000) i no el
                     número que es veu a la pantalla: deia «463» mentre el jugador llegia
                     «46». La pista té mil passos per tenir prou finor amb el dit i amb
                     l'escala logarítmica; això és detall d'implementació, no la resposta. */
                  aria-valuetext={`${val.toLocaleString("ca")} ${unit}`}
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

      {/* Abandonar era un enllaç pelat de 124 × 15,5 px mesurats —per sota dels 44 px que el
          projecte declara i per sota fins i tot dels 24 de la norma—, aparcat permanentment
          allà on descansa el polze, i que executava un POST irreversible d'un sol toc. A sobre
          el botó de desfer de l'ordenació el desplaçava amunt i avall a cada tria. Ara és un
          botó amb zona de toc de debò i demana confirmació. */}
      <div style={{ marginTop: "var(--qc-5)", textAlign: "center" }}>
        {!confirmAbandon ? (
          <button className="qc-btn qc-btn--ghost" onClick={() => setConfirmAbandon(true)}
            style={{ color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)", border: 0 }}>
            Abandona la partida
          </button>
        ) : (
          <div className="qc-panel" style={{ maxWidth: 360, margin: "0 auto" }}>
            <p style={{ margin: "0 0 var(--qc-3)", fontSize: "var(--qc-t-small)" }}>
              Segur? Perdràs el que portes d'aquesta partida.
            </p>
            <div style={{ display: "flex", gap: "var(--qc-2)" }}>
              <button className="qc-btn" style={{ flex: 1 }} onClick={() => setConfirmAbandon(false)}>
                Segueix jugant
              </button>
              <button className="qc-btn" style={{ flex: 1, color: "var(--qc-live-text)" }}
                onClick={() => { api(`/matches/${props.matchId}/abandon`, { method: "POST" }).then(props.onAbandon).catch(() => setConfirmAbandon(false)); }}>
                Abandona
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
