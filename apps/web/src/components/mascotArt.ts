// Dades de dibuix de la mascota (el gat de quiz.cat), separades del component perquè
// també les faci servir el generador de la fulla d'expressions.
//
// Principi de disseny: **una sola geometria de cap** i les expressions com a capes que
// només canvien ULLS i BOCA. És el que fa que les 7 cares semblin el mateix gat i no
// set dibuixos diferents. Tot en un viewBox de 100×100, sense degradats ni filtres,
// perquè es llegeixi igual a 128 px que a 32 (icona de l'app i favicon).
//
// El taronja no és decoratiu: lliga amb la barra d'energia que ja hi ha al joc. I s'ha
// evitat expressament qualsevol element folklòric (barretina i companyia), que envelleix
// malament i és el recurs més gastat.

export const FUR = "#F0A044";
export const FUR_DARK = "#D9822B";
export const INK = "#2E2A27";
export const PINK = "#F2B0AC";
export const WHITE = "#FFFFFF";

export type Mood =
  | "neutre" // per defecte: presentant
  | "content" // has encertat
  | "trist" // has fallat
  | "sorpres" // ratxa, pujada de nivell
  | "adormit" // energia buida
  | "ko" // fi de la tirada al survival
  | "pensant"; // esperant la teva resposta

/** Cap, orelles, ratlles, morro i bigotis: idèntics a totes les expressions. */
export const HEAD = `
  <path d="M20 38 L25 8 L47 27 Z" fill="${FUR}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M80 38 L75 8 L53 27 Z" fill="${FUR}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M27 30 L29 16 L39 26 Z" fill="${PINK}"/>
  <path d="M73 30 L71 16 L61 26 Z" fill="${PINK}"/>
  <ellipse cx="50" cy="57" rx="34" ry="30" fill="${FUR}" stroke="${INK}" stroke-width="3"/>
  <path d="M43 33 q4 -7 7 -1 M57 33 q-4 -7 -7 -1" fill="none" stroke="${FUR_DARK}" stroke-width="3" stroke-linecap="round"/>
  <path d="M50 64 l-5 -5 h10 Z" fill="${PINK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M30 62 H12 M30 68 H13 M70 62 H88 M70 68 H87" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity="0.75"/>
`;

interface Face { eyes: string; mouth: string; extra?: string }

const openEye = (cx: number, r = 7) => `
  <circle cx="${cx}" cy="50" r="${r}" fill="${INK}"/>
  <circle cx="${cx + r * 0.35}" cy="${50 - r * 0.4}" r="${r * 0.3}" fill="${WHITE}"/>`;

/** Ulls i boca de cada estat d'ànim. La resta del gat no es toca mai. */
export const FACES: Record<Mood, Face> = {
  neutre: {
    eyes: openEye(37) + openEye(63),
    mouth: `<path d="M50 66 v3 M50 69 q-6 5 -9 1 M50 69 q6 5 9 1" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  },
  content: {
    // Ulls tancats cap amunt: el somriure de debò es fa amb els ulls, no amb la boca.
    eyes: `<path d="M30 52 q7 -9 14 0 M56 52 q7 -9 14 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
    mouth: `<path d="M41 67 q9 11 18 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    extra: `<path d="M16 26 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z" fill="${FUR_DARK}"/>
            <path d="M86 34 l1.5 4.5 4.5 1.5 -4.5 1.5 -1.5 4.5 -1.5 -4.5 -4.5 -1.5 4.5 -1.5 Z" fill="${FUR_DARK}"/>`,
  },
  trist: {
    // Tercera versió. Les parpelles inclinades feien un gat ENFADAT; les rectes i gruixudes,
    // un gat amb ulleres de sol. El que funciona: ulls oberts amb la pupil·la BAIXA
    // (mirant a terra) i una llàgrima prou grossa per veure's a 48 px.
    eyes: `<circle cx="37" cy="50" r="7.5" fill="${WHITE}" stroke="${INK}" stroke-width="2"/>
           <circle cx="63" cy="50" r="7.5" fill="${WHITE}" stroke="${INK}" stroke-width="2"/>
           <circle cx="37" cy="54" r="4" fill="${INK}"/>
           <circle cx="63" cy="54" r="4" fill="${INK}"/>
           <path d="M28 57 q-5 9 0 11 q5 -2 0 -11 Z" fill="#5BA9DE" stroke="${INK}" stroke-width="1.2"/>`,
    mouth: `<path d="M42 74 q8 -8 16 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  },
  sorpres: {
    eyes: openEye(37, 9) + openEye(63, 9),
    mouth: `<ellipse cx="50" cy="73" rx="5" ry="6" fill="${INK}"/>`,
    // Marques de moviment simètriques: abans hi havia un traç buit que semblava una taca.
    extra: `<path d="M14 30 l-7 -4 M86 30 l7 -4" stroke="${FUR_DARK}" stroke-width="3" stroke-linecap="round"/>`,
  },
  adormit: {
    eyes: `<path d="M30 50 q7 8 14 0 M56 50 q7 8 14 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
    mouth: `<path d="M44 71 h12" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
    extra: `<text x="80" y="20" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="${INK}">z</text>
            <text x="90" y="10" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="${INK}">z</text>`,
  },
  ko: {
    eyes: `<path d="M32 45 l10 10 M42 45 l-10 10 M58 45 l10 10 M68 45 l-10 10" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
    mouth: `<path d="M42 71 q4 -4 8 0 q4 4 8 0" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  },
  pensant: {
    // Mirada de reüll: la pupil·la desplaçada fa tota la feina.
    eyes: `<circle cx="37" cy="50" r="7" fill="${WHITE}" stroke="${INK}" stroke-width="2"/>
           <circle cx="63" cy="50" r="7" fill="${WHITE}" stroke="${INK}" stroke-width="2"/>
           <circle cx="40" cy="48" r="3.5" fill="${INK}"/>
           <circle cx="66" cy="48" r="3.5" fill="${INK}"/>`,
    mouth: `<path d="M44 70 q6 3 12 -1" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  },
};

/** SVG complet d'una cara (l'usen tant el component com la fulla de proves). */
export const mascotSvg = (mood: Mood) =>
  `${HEAD}${FACES[mood].extra ?? ""}${FACES[mood].eyes}${FACES[mood].mouth}`;
