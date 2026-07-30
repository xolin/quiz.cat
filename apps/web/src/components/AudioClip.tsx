import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon.js";

/**
 * Reproductor dels clips de veu. Sona sol en començar la ronda; si el navegador
 * bloqueja la reproducció automàtica (passa quan encara no hi ha hagut cap
 * interacció a la pàgina), es demana un toc en comptes de deixar la ronda muda.
 */
export function AudioClip(props: { src?: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [plays, setPlays] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !props.src) return;
    setBlocked(false);
    setPlays(0);
    el.currentTime = 0;
    el.play().then(() => setPlays(1)).catch(() => setBlocked(true));
  }, [props.src]);

  function play() {
    const el = ref.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().then(() => { setBlocked(false); setPlays((n) => n + 1); }).catch(() => setBlocked(true));
  }

  return (
    <div style={{
      padding: "var(--qc-5)", width: "100%",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--qc-2)",
    }}>
      <audio
        ref={ref}
        src={props.src}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
      <button
        onClick={play}
        className="qc-btn"
        aria-label={plays === 0 ? "Escolta el clip" : "Torna a escoltar el clip"}
        style={{
          width: 72, height: 72, borderRadius: "50%", padding: 0,
          borderColor: "var(--qc-amber)",
          background: playing ? "var(--qc-amber)" : "transparent",
          color: playing ? "var(--qc-ink-on-light)" : "var(--qc-amber)",
        }}
      >
        <Icon name={playing ? "speaker" : "play"} size={28} />
      </button>
      <span className="qc-label" style={{ color: blocked ? "var(--qc-live-text)" : "var(--qc-ink-dim)" }}>
        {blocked
          ? "Toca per escoltar"
          : playing
            ? "Sonant…"
            : plays === 0
              ? "Escolta el clip"
              : `Torna a escoltar${plays > 1 ? ` (${plays})` : ""}`}
      </span>
    </div>
  );
}
