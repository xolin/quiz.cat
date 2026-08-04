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

// ── Nivell per temàtica ─────────────────────────────────────────────────────
// Un sol número d'habilitat no distingeix qui sap química de qui no: una pregunta de
// química és fàcil per al primer i molt difícil per al segon, i amb un rating global tots
// dos reben exactament les mateixes preguntes.

/**
 * Respostes "virtuals" que pesa el nivell GLOBAL dins del d'una temàtica.
 *
 * És el que impedeix que tres respostes de química decideixin que ets químic. Amb 0
 * respostes al tema, el nivell efectiu és el global; amb 12, el global i el del tema pesen
 * igual; amb 100, mana el del tema. El mateix encongiment que fem servir per a la dificultat
 * observada de les preguntes, aplicat a l'altra banda.
 */
const TOPIC_PRIOR_WEIGHT = 12;

/** El nivell que s'ha de fer servir per triar preguntes d'una temàtica concreta. */
export function effectiveTopicSkill(
  globalSkill: number,
  topic: { skill: number; answers: number } | null | undefined,
): number {
  if (!topic || topic.answers <= 0) return globalSkill;
  const w = topic.answers / (topic.answers + TOPIC_PRIOR_WEIGHT);
  return topic.skill * w + globalSkill * (1 - w);
}

/**
 * Dificultat MESURADA d'una pregunta, a partir de com se'n surt la gent.
 *
 * L'encert es normalitza per l'ATZAR de la mecànica abans de res: un 25% a resposta
 * múltiple vol dir que no ho sap ningú, mentre que el mateix 25% en un "més o menys"
 * (atzar del 50%) vol dir que la pregunta enganya activament. Sense normalitzar, les
 * mecàniques amb moltes opcions sortirien sempre més difícils que les de dues.
 *
 * Després s'encongeix cap a la dificultat declarada segons quantes respostes hi hagi, pel
 * mateix motiu de sempre: amb cinc respostes, el que mesures és soroll.
 */
export function observedDifficulty(
  served: number, correct: number, chance: number, declared: number,
): number | null {
  if (served <= 0) return null;
  const rate = correct / served;
  // Coneixement per damunt de l'atzar, de 0 (ningú no ho sap) a 1 (tothom ho encerta).
  const known = Math.max(0, Math.min(1, (rate - chance) / Math.max(0.01, 1 - chance)));
  const measured = 1 + 4 * (1 - known); // 1 = fàcil · 5 = difícil
  const w = served / (served + TOPIC_PRIOR_WEIGHT);
  return Math.max(1, Math.min(5, measured * w + declared * (1 - w)));
}
