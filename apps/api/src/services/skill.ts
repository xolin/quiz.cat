// Rating d'habilitat per usuari (escala 1-5), estil Elo.
// Cada resposta mou el rating cap amunt/avall segons la dificultat de la pregunta:
// encertar-ne una de difícil puja molt; fallar-ne una de fàcil baixa molt.

export const DIFFICULTIES = ["easy", "normal", "hard", "adaptive"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export function isDifficulty(x: unknown): x is Difficulty {
  return typeof x === "string" && (DIFFICULTIES as readonly string[]).includes(x);
}

const SPREAD = 1.5; // com de sensible és el rating a la diferència de dificultat

/** Nou rating després d'una resposta. `answers` = respostes prèvies (escalfament més ràpid al principi). */
export function updateSkill(skill: number, qDifficulty: number, isCorrect: boolean, answers: number): number {
  const K = answers < 20 ? 0.28 : 0.13; // aprèn ràpid les primeres partides, després s'estabilitza
  const expected = 1 / (1 + Math.pow(10, (qDifficulty - skill) / SPREAD));
  const next = skill + K * ((isCorrect ? 1 : 0) - expected);
  return Math.max(1, Math.min(5, next));
}

export function skillLabel(skill: number): string {
  if (skill < 1.8) return "Principiant";
  if (skill < 2.6) return "Aprenent";
  if (skill < 3.4) return "Competent";
  if (skill < 4.2) return "Expert";
  return "Mestre";
}
