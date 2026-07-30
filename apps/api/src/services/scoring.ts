// Puntuació d'una ronda. Tot es calcula al SERVIDOR amb el seu propi rellotge.
//
// - Base: 100 punts per encert.
// - Bonus rapidesa: fins a +100, proporcional al temps restant.
// - Bonus ratxa (dins de la partida): +15 per encert consecutiu a partir del 2n, límit +75.
// - Fora de temps (límit + 2s de gràcia de xarxa): compta com a error, 0 punts.

export const GRACE_MS = 2000;

export interface ScoreInput {
  isCorrect: boolean;
  responseMs: number;
  timeLimitMs: number;
  consecutiveBefore: number; // encerts consecutius previs dins de la partida
  baseMultiplier?: number; // 0..1 — per a punts graduats (p. ex. estimació per proximitat)
}

export interface ScoreBreakdown {
  base: number;
  speedBonus: number;
  streakBonus: number;
  total: number;
  expired: boolean;
}

export function scoreRound(input: ScoreInput): ScoreBreakdown {
  const expired = input.responseMs > input.timeLimitMs + GRACE_MS;
  if (!input.isCorrect || expired) {
    return { base: 0, speedBonus: 0, streakBonus: 0, total: 0, expired };
  }
  const remaining = Math.max(0, input.timeLimitMs - input.responseMs);
  const speedBonus = Math.floor((100 * remaining) / input.timeLimitMs);
  const streakBonus = Math.min(75, input.consecutiveBefore * 15);
  const base = Math.round(100 * (input.baseMultiplier ?? 1)); // graduat si baseMultiplier < 1
  return { base, speedBonus, streakBonus, total: base + speedBonus + streakBonus, expired };
}
