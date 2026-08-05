import type { OrderingAnswer } from "@quizcat/shared";

// given: { order: [ids] } · truth: { order: [ids] }

/**
 * INVERSIONS entre la resposta i l'ordre bo: parelles d'elements que has posat al revés.
 *
 * És millor mesura de "com de a prop has quedat" que comptar posicions encertades: si
 * desplaces tota la llista un lloc no n'encertes CAP posició, tot i haver entès l'ordre
 * gairebé sencer. D'inversions, en canvi, només en tens unes poques.
 *
 * Torna `null` si la resposta no té la forma esperada.
 */
export function orderingInversions(given: any, truth: OrderingAnswer): number | null {
  if (!Array.isArray(given?.order)) return null;
  if (given.order.length !== truth.order.length) return null;
  const rank = new Map(truth.order.map((id, i) => [id, i]));
  const pos: number[] = [];
  for (const id of given.order) {
    const r = rank.get(id);
    if (r === undefined) return null; // ids que no són d'aquesta pregunta
    pos.push(r);
  }
  let inversions = 0;
  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) if (pos[i] > pos[j]) inversions++;
  }
  return inversions;
}

/**
 * Es perdona com a màxim UNA inversió: haver intercanviat dos elements veïns.
 *
 * Abans era exacte o res, i tres de quatre puntuaven igual que zero de quatre. Amb quatre
 * elements l'atzar ja és 1 de 24 —la mecànica no necessitava aquesta duresa afegida— i el
 * producte diu explícitament que ningú s'ha de sentir examinat. Perdonar-ne UNA i prou manté
 * que l'ordre s'hagi d'entendre: amb dues, n'hi hauria prou d'endevinar-ne la meitat.
 */
const FORGIVEN_INVERSIONS = 1;

export function ordering(given: any, truth: OrderingAnswer): boolean {
  const inv = orderingInversions(given, truth);
  return inv !== null && inv <= FORGIVEN_INVERSIONS;
}

/**
 * Punts graduats, com ja fa l'estimació per proximitat: sencers si l'ordre és exacte,
 * retallats si s'ha perdonat una inversió. El client ho detecta per `points.base < 100`.
 */
export function orderingBaseMultiplier(given: any, truth: OrderingAnswer): number {
  const inv = orderingInversions(given, truth);
  if (inv === null || inv > FORGIVEN_INVERSIONS) return 0;
  return inv === 0 ? 1 : 0.6;
}
