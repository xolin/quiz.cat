import { mascotSvg, type Mood } from "./mascotArt.js";

/**
 * El gat de quiz.cat. Fa d'amfitrió del joc: reacciona a cada moment (encert, error,
 * ratxa, energia buida, fi de tirada) en comptes de ser un adorn en un racó.
 *
 * El dibuix viu a `mascotArt.ts` perquè la fulla d'expressions el pugui generar sense
 * React. Aquí només hi ha la caixa i l'accessibilitat.
 */
export function Mascot(props: { mood?: Mood; size?: number; title?: string }) {
  const mood = props.mood ?? "neutre";
  const size = props.size ?? 64;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={props.title ?? MOOD_LABEL[mood]}
      style={{ display: "block", flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: mascotSvg(mood) }}
    />
  );
}

/** Text alternatiu: qui va amb lector de pantalla també ha de saber què fa el gat. */
const MOOD_LABEL: Record<Mood, string> = {
  neutre: "el gat de quiz.cat",
  content: "el gat, content",
  trist: "el gat, decebut",
  sorpres: "el gat, sorprès",
  adormit: "el gat, adormit",
  ko: "el gat, KO",
  pensant: "el gat, pensant",
};
