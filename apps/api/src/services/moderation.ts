// Auto-triatge de preguntes de la comunitat per consens de vots.
// Casos clars → automàtic (l'admin no ha de revisar-ho tot); la resta queda a la cua de l'admin.

export const APPROVE_MIN = 5; // m'agrada mínims per publicar
export const REJECT_MIN = 5; // no m'agrada mínims per rebutjar

export function triage(likes: number, dislikes: number): "publish" | "reject" | null {
  const total = likes + dislikes;
  if (total === 0) return null;
  if (likes >= APPROVE_MIN && likes / total >= 0.75) return "publish";
  if (dislikes >= REJECT_MIN && dislikes / total >= 0.6) return "reject";
  return null; // dubtós → decideix l'admin
}
