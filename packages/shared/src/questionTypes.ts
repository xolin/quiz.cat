// Contracte compartit dels tipus de pregunta (client + servidor).
// Afegir un tipus nou = afegir el seu slug aquí + payload/answer + validador (backend) + renderer (client).

export const QUESTION_TYPES = [
  "multiple_choice",
  "text_input", // retirat de l'MVP (fricció d'escriure); el tipus es conserva
  "audio_clip",
  "image_guess",
  "map_guess",
  "ordering",
  "higher_lower",
  "estimation",
  "timeline",
  "silhouette",
] as const;

export type QuestionTypeSlug = (typeof QUESTION_TYPES)[number];

export interface Choice {
  id: string;
  text?: string;
  mediaId?: string;
}

// --- PAYLOAD: el que el client renderitza (sense la resposta correcta) ---
export interface MultipleChoicePayload {
  options: Choice[];
}
export type TextInputPayload = Record<string, never>;
export interface AudioClipPayload {
  mediaId: string;
  playMs: number; // p. ex. 10000 = clip de 10s
  options?: Choice[];
}
export interface ImageGuessPayload {
  imageUrl?: string; // ruta servida (MVP: /mystery/*.jpg); futur: via mediaId + MinIO
  mediaId?: string;
  options?: Choice[];
  reveal?: "blur"; // estil de revelat progressiu al client
}
export interface MapGuessPayload {
  center: [number, number]; // [lat, lng] inicial del mapa
  zoom: number;
}
export interface OrderingPayload {
  items: Choice[]; // en ordre barrejat de presentació
  criterion?: string; // p. ex. "de nord a sud"
}

// --- ANSWER: la veritat. NOMÉS al servidor, mai s'envia al client ---
export interface MultipleChoiceAnswer {
  correctId: string;
}
export interface TextInputAnswer {
  accepted: string[];
  normalize?: { lowercase?: boolean; stripAccents?: boolean };
}
export interface MapGuessAnswer {
  lat: number;
  lng: number;
  toleranceKm: number;
}
export interface OrderingAnswer {
  order: string[]; // ids en l'ordre correcte
}
export interface HigherLowerPayload {
  metric: string; // "població", "superfície"
  a: { label: string; display: string }; // valor conegut (mostrat)
  b: { label: string }; // valor amagat
}
export interface HigherLowerAnswer {
  bHigher: boolean; // b és més que a?
  bDisplay: string; // per revelar el valor de b
}
export interface EstimationPayload {
  unit: string; // "milions d'hab.", "mil km²"...
  min: number;
  max: number;
  step: number;
  scale?: "linear" | "log"; // "log" = més resolució als valors petits
}
export interface EstimationAnswer {
  value: number; // valor real
  tolerancePct: number; // marge d'encert (%): dins → correcte
}
export interface SilhouettePayload {
  path: string; // contorn SVG (M/L/Z) en coordenades del viewBox
  w: number; // amplada del viewBox (l'alçada surt de la forma real)
  h: number;
  options: Choice[];
  reveal?: "wipe"; // com es descobreix la silueta amb el temps
}
export interface TimelinePayload {
  events: Choice[]; // fets en ordre de presentació (barrejat)
  criterion?: string; // p. ex. "del més antic al més recent"
}
export interface TimelineAnswer {
  order: string[]; // ids en ordre cronològic correcte
  years: Record<string, number>; // any de cada fet (negatiu = aC), per revelar la línia de temps
}

// El que el jugador envia com a resposta (per tipus).
export type GivenAnswer =
  | { choiceId: string } // multiple_choice / audio_clip / image_guess
  | { text: string } // text_input
  | { lat: number; lng: number } // map_guess
  | { order: string[] } // ordering
  | { choice: "higher" | "lower" } // higher_lower
  | { value: number }; // estimation
