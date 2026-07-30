// Energia: mesurador 0-100 que es carrega jugant (+ per encert) i amb el temps (regeneració passiva).
// Es gasta per jugar un mini-joc. NO bloqueja el quiz base (disseny no-punitiu, flywheel positiu).

export const ENERGY_MAX = 100;
export const ENERGY_REGEN_MS = 60_000; // +1 energia per minut (ple des de 0 en ~100 min)
export const ENERGY_PER_CORRECT = 5; // càrrega activa per resposta encertada
export const MINIGAME_COST = 100; // el mini-joc gasta la barra plena

/** Regenera l'energia segons el temps transcorregut des de l'àncora. */
export function regen(energy: number, anchor: Date, now: Date): { energy: number; anchor: Date } {
  if (energy >= ENERGY_MAX) return { energy: ENERGY_MAX, anchor: now };
  const points = Math.floor((now.getTime() - anchor.getTime()) / ENERGY_REGEN_MS);
  if (points <= 0) return { energy, anchor };
  const newEnergy = Math.min(ENERGY_MAX, energy + points);
  const newAnchor = newEnergy >= ENERGY_MAX ? now : new Date(anchor.getTime() + points * ENERGY_REGEN_MS);
  return { energy: newEnergy, anchor: newAnchor };
}

/** Regenera i aplica un delta (guanyar/gastar). Punt únic de mutació d'energia. */
export function applyEnergy(energy: number, anchor: Date, now: Date, delta: number): { energy: number; anchor: Date } {
  const r = regen(energy, anchor, now);
  const wasFull = r.energy >= ENERGY_MAX;
  const next = Math.max(0, Math.min(ENERGY_MAX, r.energy + delta));
  let a = r.anchor;
  if (next >= ENERGY_MAX) a = now; // ple: no cal regenerar
  else if (wasFull && delta < 0) a = now; // era ple i hem gastat → la regeneració arrenca ara
  return { energy: next, anchor: a };
}

/** Mil·lisegons fins al proper punt d'energia (per al compte enrere de la UI). 0 si ja és ple. */
export function msToNextPoint(energy: number, anchor: Date, now: Date): number {
  if (energy >= ENERGY_MAX) return 0;
  const elapsed = (now.getTime() - anchor.getTime()) % ENERGY_REGEN_MS;
  return ENERGY_REGEN_MS - elapsed;
}

import type { PrismaClient } from "@prisma/client";

/** Regenera i persisteix l'energia; retorna l'estat actual. Punt de sincronització (lectura). */
export async function syncEnergy(prisma: PrismaClient, userId: string, now = new Date()) {
  const p = await prisma.profile.findUniqueOrThrow({
    where: { id: userId },
    select: { energy: true, energyUpdatedAt: true },
  });
  const r = regen(p.energy, p.energyUpdatedAt, now);
  if (r.energy !== p.energy || r.anchor.getTime() !== p.energyUpdatedAt.getTime()) {
    await prisma.profile.update({ where: { id: userId }, data: { energy: r.energy, energyUpdatedAt: r.anchor } });
  }
  return { energy: r.energy, anchor: r.anchor, msToNext: msToNextPoint(r.energy, r.anchor, now), max: ENERGY_MAX };
}
