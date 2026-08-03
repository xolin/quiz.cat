// Joc d'icones de quiz.cat. Substitueix els 66 emojis que feien d'icona: un emoji canvia
// de dibuix segons el sistema operatiu, no hereta el color del text i no es pot alinear.
//
// Gramàtica: 24×24, traç de 2 px amb extrems rodons, `currentColor`. La mateixa línia que
// la mascota, perquè el gat i les icones semblin del mateix joc. Es dibuixen com a SVG
// intern (igual que `mascotArt.ts`) per poder barrejar traç i massís sense embuts.

export const ICONS = {
  // ── Modes i navegació ──
  play: `<path d="M8.5 5.5l10 6.5-10 6.5Z" fill="currentColor" stroke="none"/>`,
  skull: `<path d="M12 3a7.5 7.5 0 0 0-7.5 7.5v2.8L6.5 16v3.5h11V16l2-2.7v-2.8A7.5 7.5 0 0 0 12 3Z"/>
    <circle cx="9.2" cy="11" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="14.8" cy="11" r="1.5" fill="currentColor" stroke="none"/>
    <path d="M11 19.5v-2.6M13 19.5v-2.6"/>`,
  calendar: `<rect x="3.5" y="5.5" width="17" height="15" rx="1.5"/><path d="M3.5 10.5h17M8 3.5v4M16 3.5v4"/>`,
  puzzle: `<path d="M4.5 4.5h6v6h-6zM13.5 6.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 15.5h6v4h-6z"/>`,
  cart: `<path d="M3 4.5h2.4l2.3 10.3h10.6"/><path d="M6.6 7.5h14L19 14.3H8"/>
    <circle cx="9.5" cy="18.4" r="1.5"/><circle cx="17.5" cy="18.4" r="1.5"/>`,
  trophy: `<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/>
    <path d="M8 5.5H5.5V8A2.5 2.5 0 0 0 8 10.5M16 5.5h2.5V8A2.5 2.5 0 0 1 16 10.5"/>
    <path d="M12 13v4M9 20h6"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  search: `<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>`,
  settings: `<path d="M4 7h16M4 12h16M4 17h16"/>
    <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/>
    <circle cx="7" cy="17" r="2" fill="currentColor" stroke="none"/>`,
  home: `<path d="M4 11l8-6.5 8 6.5v9H4Z"/><path d="M10 20v-5h4v5"/>`,
  // Escut: moderar és protegir el pou de preguntes, i a 16 px es llegeix.
  tools: `<path d="M12 3.2l7 2.4v6.1c0 4-3 7-7 8.5-4-1.5-7-4.5-7-8.5V5.6Z"/>
    <path d="M9 12l2.2 2.2L15.5 10"/>`,
  gamepad: `<rect x="3" y="8" width="18" height="9" rx="4.5"/>
    <path d="M8 11v3M6.5 12.5h3M15.2 11.8h.01M17.2 14h.01"/>`,
  arrowLeft: `<path d="M11 6l-6 6 6 6M5 12h14"/>`,
  arrowRight: `<path d="M13 6l6 6-6 6M19 12H5"/>`,
  undo: `<path d="M4 9h9a5 5 0 1 1 0 10H8"/><path d="M8 5L4 9l4 4"/>`,

  // ── Estat i economia ──
  coin: `<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 9.8h5M9.5 14.2h5"/>`,
  flame: `<path d="M12 3.5c3 3.5 5.5 5.5 5.5 9.5A5.5 5.5 0 0 1 6.5 13c0-2 1-3.6 2.5-5 .3 1.5 1 2.5 2 3 0-3 .5-5.5 1-7.5Z"/>`,
  bolt: `<path d="M13.5 3L6 13.5h4.5L10 21l7.5-10.5H13Z"/>`,
  star: `<path d="M12 4l2.4 5.2 5.6.7-4.1 3.9 1 5.6-4.9-2.8-4.9 2.8 1-5.6L4 9.9l5.6-.7Z"/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7"/>`,
  cross: `<path d="M6 6l12 12M18 6L6 18"/>`,
  clock: `<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3.5 2.5"/>`,
  party: `<path d="M4 20l6-13 8 8Z"/><path d="M14 4.5c1.5.6 2.4 1.6 2.8 3M18 3.2c2.2.9 3.5 2.4 4 4.6"/>`,
  thumbUp: `<path d="M7 20V10l4.5-6c1.4.3 2 1.4 1.8 2.7L12.8 10h5.4a1.8 1.8 0 0 1 1.7 2.3l-1.7 6A2 2 0 0 1 16.3 20Z"/>
    <path d="M7 10H4v10h3"/>`,
  thumbDown: `<path d="M17 4v10l-4.5 6c-1.4-.3-2-1.4-1.8-2.7l.5-3.3H5.8A1.8 1.8 0 0 1 4.1 11.7l1.7-6A2 2 0 0 1 7.7 4Z"/>
    <path d="M17 14h3V4h-3"/>`,
  speaker: `<path d="M4 9.5h3L12 5v14l-5-4.5H4Z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.6a7.5 7.5 0 0 1 0 10.8"/>`,
  replay: `<path d="M20 12a8 8 0 1 0-3 6.2"/><path d="M20 6v6h-6"/>`,

  // ── Categories i temes ──
  globe: `<circle cx="12" cy="12" r="8.5"/>
    <path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>`,
  column: `<path d="M4 20h16M6.5 20V9.5m3.7 10.5V9.5m3.6 10.5V9.5m3.7 10.5V9.5M3.5 9.5h17L12 4.5Z"/>`,
  flask: `<path d="M9 3.5h6M10 3.5v5.2L5.6 18a2 2 0 0 0 1.8 3h9.2a2 2 0 0 0 1.8-3L14 8.7V3.5M7.4 14h9.2"/>`,
  ticket: `<path d="M3 8.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/>
    <path d="M9 6.5v11"/>`,
  paw: `<circle cx="7" cy="9.5" r="2"/><circle cx="12" cy="7.5" r="2"/><circle cx="17" cy="9.5" r="2"/>
    <path d="M12 12.5c-3 0-5 2-5 4.1 0 1.7 1.4 2.7 3 2.7h4c1.6 0 3-1 3-2.7 0-2.1-2-4.1-5-4.1Z"/>`,
  film: `<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M8 5v14M16 5v14M3.5 12h17"/>`,
  book: `<path d="M12 5.5V19M5 4.5h5.5A1.5 1.5 0 0 1 12 6v13a2 2 0 0 0-2-1.5H5Z"/>
    <path d="M19 4.5h-5.5A1.5 1.5 0 0 0 12 6v13a2 2 0 0 1 2-1.5h5Z"/>`,
  frame: `<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 16l4.5-4.5 3 3L15 11l5 5"/>
    <circle cx="9" cy="8.5" r="1.4"/>`,
  speech: `<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-5 4V6Z"/><path d="M8 8.5h8M8 11.5h5"/>`,
  note: `<path d="M9 18V6.5l9-2v11"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="15.5" cy="15.5" r="2.5"/>`,
  castle: `<path d="M4 20V9.5h3V6l2.5 2.2L12 5.5l2.5 2.7L17 6v3.5h3V20Z"/><path d="M10 20v-4h4v4"/>`,
  flag: `<path d="M6 4v16M6 5h12l-2.5 4L18 13H6"/>`,
} as const;

export type IconName = keyof typeof ICONS;

/** Categoria (slug de la BD) → icona. L'emoji de la BD s'ignora al client. */
export const CATEGORY_ICON: Record<string, IconName> = {
  geografia: "globe",
  historia: "column",
  ciencia: "flask",
  cultura: "ticket",
  natura: "paw",
};

/** Temàtica (slug de la BD) → icona. */
export const TOPIC_ICON: Record<string, IconName> = {
  mon: "globe",
  historia: "column",
  ciencia: "flask",
  cultura: "ticket",
  cinema: "film",
  literatura: "book",
  art: "frame",
  natura: "paw",
  llengues: "speech",
  musica: "note",
  // No hi ha cap icona d'esport al joc: `trophy` és la que hi encaixa sense haver-ne de
  // dibuixar una de nova, i el trofeu ja llegeix com a competició.
  esport: "trophy",
  catalunya: "castle",
  espanya: "flag",
};

/** Color de secció per categoria: el rètol n'agafa el to. */
export const CATEGORY_COLOR: Record<string, string> = {
  geografia: "var(--qc-geo)",
  historia: "var(--qc-hist)",
  ciencia: "var(--qc-sci)",
  cultura: "var(--qc-cult)",
  natura: "var(--qc-nat)",
};
