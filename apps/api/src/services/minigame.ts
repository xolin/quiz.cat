import { shuffle } from "../lib/rng.js";

// Mini-joc "memory" (parelles). El servidor guarda el deck; el client mai veu els valors amagats.
// Els crèdits (que toquen monetització) els calcula el servidor → anti-trampes per disseny.

export const MEMORY_PAIRS = 6; // 12 cartes

export interface Deck {
  values: string[]; // valor de cada carta (parelles), barrejat — server-only
  labels: Record<string, string>; // valor → etiqueta a mostrar
}

/** Crea un deck de parelles a partir d'una llista d'ítems {value,label}. */
export function buildDeck(items: Array<{ value: string; label: string }>, pairs: number): Deck {
  const chosen = shuffle(items).slice(0, pairs);
  const labels: Record<string, string> = {};
  for (const it of chosen) labels[it.value] = it.label;
  const values = shuffle(chosen.flatMap((it) => [it.value, it.value]));
  return { values, labels };
}

/** Crèdits en guanyar: base per parella, penalització per moviments de més, bonus de rapidesa. */
export function creditsFor(pairs: number, moves: number, ms: number): number {
  const base = pairs * 2;
  const extraMoves = Math.max(0, moves - pairs); // 0 = partida perfecta
  const penalty = Math.floor(extraMoves / 2);
  const softLimitMs = pairs * 8000; // referència de temps "bo"
  const speedBonus = Math.max(0, Math.ceil(((softLimitMs - ms) / softLimitMs) * 10));
  return Math.max(1, base - penalty + speedBonus);
}
