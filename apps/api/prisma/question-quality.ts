// Qualitat del pou de preguntes: contrasta la dificultat que DIEM amb la que la gent
// demostra jugant, i assenyala les preguntes que probablement no són difícils sinó
// incorrectes.
//
//   pnpm quality:questions            → només mira
//   pnpm quality:questions --apply    → i a més escriu `observedDifficulty`
//
// Per què cal: la dificultat de cada pregunta la calcula `fameRanker` a partir del
// percentil de sitelinks de Wikipedia, que mesura com de FAMOSA és l'entitat — no com de
// difícil és la pregunta. És una suposició raonable i mai s'ha comprovat. `QuestionStats`
// porta des del juliol de 2026 gravant encerts i mai ningú no l'havia llegit.
//
// Aquest script no toca res: només mira.
import { PrismaClient } from "@prisma/client";
import { observedDifficulty } from "../src/services/skill.js";

const prisma = new PrismaClient();

/**
 * Probabilitat d'encertar PER ATZAR, per mecànica.
 *
 * És el que fa que la detecció de preguntes sospitoses sigui honesta: comparar-ho tot amb
 * un llindar únic seria fals, perquè encertar de sort un "més o menys" és una de cada dues
 * i encertar una ordenació de quatre elements és una de cada vint-i-quatre. Una pregunta
 * només és sospitosa si es falla MÉS del que la fallaria algú responent a l'atzar.
 */
const CHANCE: Record<string, number> = {
  multiple_choice: 0.25, // quatre opcions (les de dues surten a `chanceFor`)
  image_guess: 0.25,
  silhouette: 0.25,
  audio_clip: 0.25,
  higher_lower: 0.5,
  ordering: 1 / 24, // 4! permutacions
  timeline: 1 / 24,
  estimation: 0.05, // continu amb tolerància: encertar de sort és gairebé impossible
  map_guess: 0.02,
};

function chanceFor(typeSlug: string, payload: unknown): number {
  const base = CHANCE[typeSlug] ?? 0.25;
  // Les de resposta múltiple no sempre tenen quatre opcions.
  const options = (payload as { options?: unknown[] })?.options;
  if (Array.isArray(options) && options.length > 1) return 1 / options.length;
  return base;
}

/** Mostra mínima per dir-ne res. Per sota, el que veus és soroll. */
const MIN_SERVED_TREND = 10;
const MIN_SERVED_SUSPECT = 20;

const pct = (x: number) => `${Math.round(x * 100)}%`;
const bar = (x: number, width = 24) => "█".repeat(Math.round(x * width)).padEnd(width, "·");

async function main() {
  const rows = await prisma.questionStats.findMany({
    where: { timesServed: { gt: 0 } },
    select: {
      timesServed: true, timesCorrect: true, avgResponseMs: true,
      question: { select: { id: true, prompt: true, typeSlug: true, difficulty: true, payload: true, topicSlug: true, status: true } },
    },
  });
  const live = rows.filter((r) => r.question.status === "published");
  const totalServed = live.reduce((s, r) => s + r.timesServed, 0);
  const totalCorrect = live.reduce((s, r) => s + r.timesCorrect, 0);
  const published = await prisma.question.count({ where: { status: "published" } });

  console.log(`\n═══ Qualitat del pou ═══`);
  console.log(`${published} preguntes publicades · ${live.length} amb dades de joc (${pct(live.length / Math.max(1, published))})`);
  console.log(`${totalServed} respostes registrades · ${pct(totalCorrect / Math.max(1, totalServed))} d'encert global\n`);

  // ── 1) La dificultat que diem contra la que es demostra ──────────────────
  console.log("── Dificultat declarada contra encert real ──");
  console.log("Si la nostra escala funciona, l'encert ha de BAIXAR de d1 a d5.\n");
  const byDifficulty = new Map<number, { served: number; correct: number; n: number }>();
  for (const r of live) {
    const d = r.question.difficulty;
    const acc = byDifficulty.get(d) ?? { served: 0, correct: 0, n: 0 };
    acc.served += r.timesServed;
    acc.correct += r.timesCorrect;
    acc.n++;
    byDifficulty.set(d, acc);
  }
  for (const d of [...byDifficulty.keys()].sort()) {
    const a = byDifficulty.get(d)!;
    const rate = a.correct / Math.max(1, a.served);
    const enough = a.served >= MIN_SERVED_TREND;
    console.log(`  d${d}  ${String(a.served).padStart(5)} respostes  ${bar(rate)} ${pct(rate).padStart(4)}${enough ? "" : "   (mostra insuficient)"}`);
  }

  // Correlació de Spearman entre dificultat declarada i encert, per pregunta. Negativa =
  // l'escala funciona (més dificultat, menys encert). A prop de zero = no diu res.
  const usable = live.filter((r) => r.timesServed >= MIN_SERVED_TREND);
  if (usable.length >= 12) {
    const rank = (xs: number[]) => {
      const order = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
      const out = new Array(xs.length).fill(0);
      order.forEach(([, i], k) => (out[i] = k));
      return out;
    };
    const ds = rank(usable.map((r) => r.question.difficulty));
    const as = rank(usable.map((r) => r.timesCorrect / r.timesServed));
    const n = ds.length;
    const d2 = ds.reduce((s, v, i) => s + (v - as[i]) ** 2, 0);
    const rho = 1 - (6 * d2) / (n * (n * n - 1));
    console.log(`\n  Correlació (Spearman) sobre ${n} preguntes amb ≥${MIN_SERVED_TREND} respostes: ${rho.toFixed(2)}`);
    console.log(`  ${rho <= -0.3 ? "L'escala prediu la dificultat." : rho >= -0.1 ? "L'escala NO prediu res: la dificultat declarada és una suposició." : "L'escala prediu feblement."}`);
  } else {
    console.log(`\n  Encara no hi ha prou preguntes amb ≥${MIN_SERVED_TREND} respostes per calcular la correlació (${usable.length}).`);
  }

  // ── 2) Per mecànica ──────────────────────────────────────────────────────
  console.log("\n── Per mecànica (comparat amb l'atzar) ──");
  const byType = new Map<string, { served: number; correct: number; chance: number }>();
  for (const r of live) {
    const t = r.question.typeSlug;
    const acc = byType.get(t) ?? { served: 0, correct: 0, chance: chanceFor(t, r.question.payload) };
    acc.served += r.timesServed;
    acc.correct += r.timesCorrect;
    byType.set(t, acc);
  }
  for (const [t, a] of [...byType.entries()].sort((x, y) => y[1].served - x[1].served)) {
    const rate = a.correct / Math.max(1, a.served);
    const verdict = a.served < MIN_SERVED_TREND ? "" : rate < a.chance ? "  ⚠ per sota de l'atzar" : "";
    console.log(`  ${t.padEnd(16)} ${String(a.served).padStart(5)}  ${pct(rate).padStart(4)}  (atzar ${pct(a.chance)})${verdict}`);
  }

  // ── 3) Preguntes sospitoses de ser incorrectes ───────────────────────────
  // No "difícils": INCORRECTES. Si la gent l'encerta menys que responent a l'atzar, el més
  // probable és que la resposta bona estigui mal calculada o que hi hagi una opció ambigua
  // que sigui igual de vàlida.
  console.log("\n── Sospitoses de ser incorrectes ──");
  const suspects = live
    .map((r) => {
      const chance = chanceFor(r.question.typeSlug, r.question.payload);
      const rate = r.timesCorrect / r.timesServed;
      // Marge de dos errors estàndard: amb mostres petites, quedar per sota de l'atzar
      // passa per casualitat molt sovint.
      const se = Math.sqrt((chance * (1 - chance)) / r.timesServed);
      return { ...r, chance, rate, suspect: r.timesServed >= MIN_SERVED_SUSPECT && rate + 2 * se < chance };
    })
    .filter((r) => r.suspect)
    .sort((a, b) => a.rate - b.rate);

  if (suspects.length === 0) {
    const eligible = live.filter((r) => r.timesServed >= MIN_SERVED_SUSPECT).length;
    console.log(`  Cap. (${eligible} preguntes tenen prou respostes per poder-ho dir; calen ≥${MIN_SERVED_SUSPECT}.)`);
  } else {
    console.log(`  ${suspects.length} preguntes s'encerten menys que responent a l'atzar:\n`);
    for (const s of suspects.slice(0, 40)) {
      console.log(`  ${pct(s.rate).padStart(4)} de ${String(s.timesServed).padStart(3)} (atzar ${pct(s.chance)})  d${s.question.difficulty}  ${s.question.prompt?.slice(0, 76)}`);
    }
  }

  // ── 4) Escriure la dificultat mesurada (només amb --apply) ───────────────
  if (process.argv.includes("--apply")) {
    console.log("\n── Escrivint `observedDifficulty` ──");
    let written = 0;
    for (const r of live) {
      const chance = chanceFor(r.question.typeSlug, r.question.payload);
      const value = observedDifficulty(r.timesServed, r.timesCorrect, chance, r.question.difficulty);
      if (value === null) continue;
      await prisma.question.update({
        where: { id: r.question.id },
        data: { observedDifficulty: Math.round(value * 100) / 100 },
      });
      written++;
    }
    console.log(`  ${written} preguntes actualitzades.`);
    console.log(`  Recorda que amb poques respostes el valor és gairebé el declarat: això`);
    console.log(`  és volgut, i és el que impedeix que cinc respostes decideixin res.`);
  } else {
    console.log("\n(Amb `--apply` escriuria `observedDifficulty` a les preguntes.)");
  }

  console.log("");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
