import { PrismaClient } from "@prisma/client";
import { seededRandom, shuffle } from "../lib/rng.js";
import type { Difficulty } from "./skill.js";

// Selecció de preguntes per a una partida.
// Tesi del producte: "variat per disseny" → evita repetir tipus o categoria en rondes
// consecutives i prioritza preguntes no vistes. A més, respecta el MODE de dificultat.

interface PoolItem {
  id: string;
  typeSlug: string;
  categoryId: string | null;
  difficulty: number;
  topicSlug: string | null;
}

function pickVaried(pool: PoolItem[], n: number): PoolItem[] {
  const result: PoolItem[] = [];
  const remaining = [...pool];
  while (result.length < n && remaining.length > 0) {
    const last = result[result.length - 1];
    let idx = remaining.findIndex(
      (q) => !last || (q.typeSlug !== last.typeSlug && q.categoryId !== last.categoryId),
    );
    if (idx === -1) idx = remaining.findIndex((q) => !last || q.typeSlug !== last.typeSlug);
    if (idx === -1) idx = 0;
    result.push(remaining.splice(idx, 1)[0]);
  }
  return result;
}

/** Temes concrets que pengen d'un bloc gros (`topicSlug` és pla, així que va aquí). */
export const TOPIC_CHILDREN: Record<string, string[]> = {
  // L'esport hi entra com un fill més: viu a la categoria Cultura i, com el cinema o la
  // música, ha de poder-se triar sol o rebre's sencer quan tries "Cultura".
  cultura: ["cinema", "literatura", "art", "musica", "llengues", "esport"],
};

/** Banda de dificultat [min,max] per als modes fixos. */
function band(mode: Difficulty): [number, number] {
  switch (mode) {
    case "easy": return [1, 2];
    case "normal": return [2, 4];
    case "hard": return [4, 5];
    default: return [1, 5];
  }
}

/** Ordena el pool per proximitat al rating: els més a prop, primer. */
function bySkillProximity(pool: PoolItem[], skill: number): PoolItem[] {
  return [...pool].sort((a, b) => Math.abs(a.difficulty - skill) - Math.abs(b.difficulty - skill));
}

/**
 * Candidats del mode adaptatiu: ~70% del teu nivell i ~30% de veïnes.
 *
 * Amb el pou ple a tots els nivells, agafar sempre "la més propera" servia NOMÉS la
 * dificultat exacta: la partida es feia plana i el rating no es movia fins a creuar el
 * mig punt. La barreja fa que es noti quan puges i deixa marge per fallar sense càstig.
 */
function adaptiveCandidates(pool: PoolItem[], skill: number, count: number): PoolItem[] {
  const dist = (q: PoolItem) => Math.abs(q.difficulty - skill);
  const own = shuffle(pool.filter((q) => dist(q) <= 0.5));
  const neighbours = shuffle(pool.filter((q) => dist(q) > 0.5 && dist(q) <= 1.5));
  const mixed = [...own.slice(0, count * 3), ...neighbours.slice(0, Math.ceil(count * 1.2))];
  // Si en aquell nivell hi ha poc material, val més el criteri antic que quedar-se curt.
  return mixed.length >= count * 2 ? shuffle(mixed) : bySkillProximity(shuffle(pool), skill).slice(0, Math.max(count * 4, 24));
}

/**
 * Banda de dificultat del survival segons la ratxa: comença fàcil i estreny.
 * La gràcia del mode és que la mort arribi *quan toca*, no a la ronda 3 per mala sort.
 */
export function survivalBand(streak: number): [number, number] {
  if (streak < 3) return [1, 2];
  if (streak < 6) return [2, 3];
  if (streak < 10) return [3, 4];
  // Sostre a [4,5] i no a [5,5]: només hi ha 8 preguntes de dificultat 5, i tancar-hi
  // la banda esgotava el pou cap a la ronda 15 i feia AFLUIXAR la tirada justament
  // quan havia de pitjar. A partir d'aquí qui apreta és el rellotge.
  return [4, 5];
}

/**
 * Següent pregunta d'una tirada de survival. A diferència del mode normal, es tria d'una
 * en una: la dificultat depèn de fins on has arribat i no es pot repetir cap pregunta
 * dins de la mateixa tirada. Retorna null si s'ha exhaurit el pou (tirada perfecta).
 */
export async function nextSurvivalQuestion(
  prisma: PrismaClient,
  opts: { userId: string; streak: number; usedIds: string[]; lastTypeSlug?: string | null; lastCategoryId?: string | null },
): Promise<{ id: string; typeSlug: string } | null> {
  const raw = await prisma.question.findMany({
    where: { status: "published" },
    select: { id: true, typeSlug: true, categoryId: true, difficulty: true, premiumPack: true, topicSlug: true },
  });
  const unlocks = await prisma.userUnlock.findMany({ where: { userId: opts.userId }, select: { packSlug: true } });
  const owned = new Set(unlocks.map((u) => u.packSlug));
  const used = new Set(opts.usedIds);
  const pool = raw.filter((q) => (!q.premiumPack || owned.has(q.premiumPack)) && !used.has(q.id));
  if (pool.length === 0) return null;

  // Prefereix les que no has vist mai (i, entre vistes, les més antigues).
  const seen = await prisma.userQuestionHistory.findMany({
    where: { userId: opts.userId },
    select: { questionId: true, lastSeenAt: true },
  });
  const seenMap = new Map(seen.map((s) => [s.questionId, s.lastSeenAt.getTime()]));
  const rank = (q: PoolItem) => seenMap.get(q.id) ?? -1;

  let [lo, hi] = survivalBand(opts.streak);
  let candidates = pool.filter((q) => q.difficulty >= lo && q.difficulty <= hi);
  // Si la banda es queda curta, eixampla-la abans que rendir-se.
  while (candidates.length === 0 && (lo > 1 || hi < 5)) {
    lo = Math.max(1, lo - 1);
    hi = Math.min(5, hi + 1);
    candidates = pool.filter((q) => q.difficulty >= lo && q.difficulty <= hi);
  }
  if (candidates.length === 0) candidates = pool;

  // Varietat: mai el mateix tipus ni la mateixa categoria que la ronda anterior.
  const varied = candidates.filter(
    (q) => q.typeSlug !== opts.lastTypeSlug && (!opts.lastCategoryId || q.categoryId !== opts.lastCategoryId),
  );
  const byType = candidates.filter((q) => q.typeSlug !== opts.lastTypeSlug);
  const final = varied.length ? varied : byType.length ? byType : candidates;

  const pick = shuffle(final).sort((a, b) => rank(a) - rank(b))[0];
  return { id: pick.id, typeSlug: pick.typeSlug };
}

export async function selectQuestions(
  prisma: PrismaClient,
  opts: { userId: string; count: number; mode: "solo" | "daily"; difficulty: Difficulty; seed?: string },
): Promise<string[]> {
  const raw = await prisma.question.findMany({
    where: { status: "published" },
    select: { id: true, typeSlug: true, categoryId: true, difficulty: true, premiumPack: true, topicSlug: true },
  });
  // Exclou el premium bloquejat: gratuïtes sempre; premium només si l'usuari té el pack.
  // El diari mai serveix premium (justícia del rànquing).
  const owned = new Set<string>();
  if (opts.mode !== "daily") {
    const unlocks = await prisma.userUnlock.findMany({ where: { userId: opts.userId }, select: { packSlug: true } });
    unlocks.forEach((u) => owned.add(u.packSlug));
  }
  const all: PoolItem[] = raw.filter((q) => !q.premiumPack || owned.has(q.premiumPack));
  if (all.length === 0) throw new Error("No hi ha preguntes publicades");

  // Diari: sempre "normal" i determinista, per justícia del rànquing.
  if (opts.mode === "daily") {
    const rand = seededRandom(opts.seed ?? "daily");
    const [lo, hi] = band("normal");
    const pool = all.filter((q) => q.difficulty >= lo && q.difficulty <= hi);
    const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
    return pickVaried(shuffle(sorted, rand), opts.count).map((q) => q.id);
  }

  // Prioritza preguntes MAI vistes per l'usuari (i les vistes fa més temps).
  const seen = await prisma.userQuestionHistory.findMany({
    where: { userId: opts.userId },
    select: { questionId: true, lastSeenAt: true },
  });
  const seenMap = new Map(seen.map((s) => [s.questionId, s.lastSeenAt.getTime()]));
  const rank = (q: PoolItem) => (seenMap.has(q.id) ? seenMap.get(q.id)! : -1); // -1 = no vista, va primer

  // Perfil (rating + temàtiques triades). Si l'usuari s'ha centrat en temes, filtra-hi.
  // Els temes concrets pengen dels blocs grossos: qui tria "Cultura" ha de rebre també
  // cinema, literatura, art i música, que abans hi eren dins i ara són temes propis.
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: opts.userId }, select: { skill: true, topics: true } });
  let pool = all;
  if (profile.topics.length > 0) {
    const wanted = new Set(profile.topics.flatMap((t) => [t, ...(TOPIC_CHILDREN[t] ?? [])]));
    const focused = all.filter((q) => q.topicSlug && wanted.has(q.topicSlug));
    if (focused.length >= opts.count) pool = focused; // prou contingut → centra-t'hi (si no, no filtra)
  }

  let candidates: PoolItem[];
  if (opts.difficulty === "adaptive") {
    // Finestra ampla al voltant del rating; tria els més propers, barrejant una mica.
    candidates = adaptiveCandidates(pool, profile.skill, opts.count);
  } else {
    let [lo, hi] = band(opts.difficulty);
    let dpool = pool.filter((q) => q.difficulty >= lo && q.difficulty <= hi);
    // Eixampla la banda si no hi ha prou varietat/quantitat.
    while (dpool.length < opts.count * 2 && (lo > 1 || hi < 5)) {
      lo = Math.max(1, lo - 1);
      hi = Math.min(5, hi + 1);
      dpool = pool.filter((q) => q.difficulty >= lo && q.difficulty <= hi);
    }
    candidates = shuffle(dpool);
  }

  // Ordena: no vistes primer, després per antiguitat; després aplica la varietat.
  candidates.sort((a, b) => rank(a) - rank(b));
  return pickVaried(candidates, opts.count).map((q) => q.id);
}
