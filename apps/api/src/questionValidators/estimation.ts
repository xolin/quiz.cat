import type { EstimationAnswer } from "@quizcat/shared";

// given: { value } · truth: { value, tolerancePct } — correcte si estàs dins del marge.
// (v1: encert binari per marge. Afinar: punts graduats per proximitat.)
export function estimation(given: any, truth: EstimationAnswer): boolean {
  if (typeof given?.value !== "number") return false;
  const margin = Math.abs(truth.value) * (truth.tolerancePct / 100);
  return Math.abs(given.value - truth.value) <= margin;
}

/** Proximitat 0..1 (1 = exacte). */
export function estimationProximity(given: number, truth: number): number {
  if (truth === 0) return given === 0 ? 1 : 0;
  return Math.max(0, 1 - Math.abs(given - truth) / Math.abs(truth));
}

/** Multiplicador de punts base (0..1) segons proximitat: al límit del marge dona 0.5, exacte 1. */
export function estimationBaseMultiplier(given: any, truth: EstimationAnswer): number {
  if (typeof given?.value !== "number") return 0;
  const prox = estimationProximity(given.value, truth.value);
  const floor = Math.max(0, 1 - truth.tolerancePct / 100); // llindar d'encert
  if (prox <= floor) return 0;
  return 0.5 + 0.5 * ((prox - floor) / (1 - floor));
}
