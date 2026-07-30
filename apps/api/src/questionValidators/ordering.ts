import type { OrderingAnswer } from "@quizcat/shared";

// given: { order: [ids] } · truth: { order: [ids] } — han de coincidir posició a posició.
export function ordering(given: any, truth: OrderingAnswer): boolean {
  if (!Array.isArray(given?.order)) return false;
  if (given.order.length !== truth.order.length) return false;
  return truth.order.every((id, i) => given.order[i] === id);
}
