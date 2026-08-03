// Generadors de preguntes a partir dels datasets de Wikidata (CC0) que baixa
// `fetch-wikidata.mjs`. Viuen fora del seed perquè són molts i el seed ja és llarg.
//
// Objectiu: treure el joc de la geografia. Abans d'aquest fitxer, el 75% de les preguntes
// eren de geografia i Història i Ciència en tenien 17 i 15.
//
// Tres regles que valen per a tot el fitxer:
//   · Només s'hi generen preguntes de dades FIABLES. Wikidata té molt de tot, però no tot
//     és igual de sòlid: les masses d'animals i les "dates de descobriment" es van haver de
//     descartar per dades brutes (veure els comentaris de `fetch-wikidata.mjs`).
//   · La DIFICULTAT surt de la fama de l'ítem PER PERCENTIL DINS DEL SEU DATASET. Amb
//     llindars absoluts de fama, tot Wikidata queia a d4-d5 i el pou quedava capgirat.
//   · Els DISTRACTORS surten del mateix dataset (altres directors, anys a prop…), que és
//     el que fa que la pregunta s'hagi de saber i no es respongui per descart.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Element { label: string; symbol: string; number: number; mass: number | null; fame: number }
interface Planet { label: string; radius: number | null; period: number | null; dist: number | null; fame: number }
interface Dated { label: string; year: number | null; fame: number }
interface Person { label: string; birth: number | null; death: number | null; fame: number }
interface Work { label: string; year: number | null; fame: number; director?: string; creator?: string; author?: string }
interface Taxon { label: string; taxon: string; group: string; fame: number }

interface Manifest {
  elements: Element[]; planets: Planet[]; scientists: Person[];
  events: Dated[]; leaders: Person[]; films: Work[]; paintings: Work[]; books: Work[]; taxa: Taxon[];
}

export interface WikidataCtx {
  prisma: PrismaClient;
  cats: { ciencia: string; historia: string; cultura: string; natura: string };
  upsertQuestion: (data: any) => Promise<boolean>;
  mcOptions: (correct: string, distractors: string[]) => [Array<{ id: string; text: string }>, string];
  shuffled: <T>(a: T[]) => T[];
  clampDiff: (d: number) => number;
  gapDifficulty: (gap: number, unit: "graus" | "anys") => number;
}

/**
 * Dificultat per PERCENTIL de fama dins del dataset: el 20% més conegut és d1, el 20%
 * menys conegut és d5. Amb llindars absoluts ("150 wikis = fàcil") tot Wikidata queia
 * a d4-d5, perquè la majoria d'ítems tenen menys wikis que un país.
 */
function fameRanker<T extends { fame: number }>(items: T[]): (item: T) => number {
  const order = [...items].sort((a, b) => b.fame - a.fame);
  const rank = new Map<T, number>(order.map((it, i) => [it, i]));
  const n = Math.max(1, order.length);
  return (item) => Math.max(1, Math.min(5, 1 + Math.floor((5 * (rank.get(item) ?? n / 2)) / n)));
}

const yearText = (y: number) => (y < 0 ? `${-y} aC` : String(y));

/**
 * Tres anys falsos a prop del bo. El marge creix com més antic és el fet: encertar
 * l'any exacte d'una batalla romana amb opcions a ±3 anys seria una loteria.
 */
function yearDistractors(year: number, shuffled: WikidataCtx["shuffled"]): string[] {
  const spread = year > 1900 ? 4 : year > 1700 ? 9 : year > 1000 ? 25 : year > 0 ? 70 : 150;
  const out = new Set<string>();
  for (const k of shuffled([1, 2, 3, -1, -2, -3])) {
    if (out.size === 3) break;
    const candidate = year + k * spread;
    if (candidate !== year && candidate < 2026) out.add(yearText(candidate));
  }
  return [...out];
}

export async function seedWikidata(ctx: WikidataCtx): Promise<number> {
  const file = path.join(__dirname, "wikidata-manifest.json");
  if (!fs.existsSync(file)) {
    console.log("Sense wikidata-manifest.json: salta (executa `node prisma/fetch-wikidata.mjs`).");
    return 0;
  }
  const wd: Manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const { prisma, cats, upsertQuestion, mcOptions, shuffled, clampDiff, gapDifficulty } = ctx;
  let n = 0;
  const tags = (...t: string[]) => ["generated", "wikidata", ...t];
  /** Els més coneguts d'un dataset (percentil 0-1), per no inflar el pou amb ítems obscurs. */
  const topBy = <T extends { fame: number }>(items: T[], pct: number) =>
    [...items].sort((a, b) => b.fame - a.fame).slice(0, Math.ceil(items.length * pct));

  /** Cronologies de 4 fets. `spacing` = de quants en quants s'agafen de la llista ordenada. */
  async function timelineSets(
    items: Dated[], categoryId: string, topicSlug: string | null, tag: string, spacings: number[],
  ) {
    const dated = items.filter((e): e is Dated & { year: number } => e.year !== null).sort((a, b) => a.year - b.year);
    for (const spacing of spacings) {
      for (let i = 0; i + 3 * spacing < dated.length; i += 4 * spacing) {
        const group = [0, 1, 2, 3].map((k) => dated[i + k * spacing]);
        const years = group.map((g) => g.year);
        if (new Set(years).size < 4) continue; // dos fets el mateix any: no es pot ordenar
        const display = shuffled(group).map((e, idx) => ({ id: String.fromCharCode(97 + idx), text: e.label, year: e.year }));
        const order = [...display].sort((a, b) => a.year - b.year).map((d) => d.id);
        const yearMap: Record<string, number> = {};
        display.forEach((d) => (yearMap[d.id] = d.year));
        const itemTag = `${tag}:${group.map((g) => g.label).sort().join("|").slice(0, 60)}`;
        const exists = await prisma.question.findFirst({ where: { typeSlug: "timeline", tags: { has: itemTag } }, select: { id: true } });
        if (exists) continue;
        const minGap = Math.min(...years.slice(1).map((y, k) => y - years[k]));
        await prisma.question.create({
          data: {
            typeSlug: "timeline", categoryId, locale: "ca",
            prompt: "Ordena aquests fets del més antic al més recent",
            payload: { events: display.map(({ id, text }) => ({ id, text })), criterion: "del més antic al més recent" },
            answer: { order, years: yearMap },
            difficulty: gapDifficulty(minGap, "anys"),
            status: "published", topicSlug, tags: tags(tag, itemTag),
          },
        });
        n++;
      }
    }
  }

  /** "Qui va fer X?" — pel·lícules, quadres i llibres segueixen el mateix patró. */
  async function authorship(
    works: Work[], authorOf: (w: Work) => string | undefined, prompt: (w: Work) => string,
    categoryId: string, tag: string,
  ) {
    const valid = works.filter((w) => authorOf(w));
    const everyone = [...new Set(valid.map((w) => authorOf(w)!))];
    if (everyone.length < 4) return;
    const diff = fameRanker(valid);
    for (const w of valid) {
      const correct = authorOf(w)!;
      const [options, correctId] = mcOptions(correct, shuffled(everyone.filter((a) => a !== correct)).slice(0, 3));
      if (await upsertQuestion({
        typeSlug: "multiple_choice", categoryId, locale: "ca",
        prompt: prompt(w), payload: { options }, answer: { correctId },
        difficulty: diff(w), status: "published", tags: tags(tag),
      })) n++;
    }
  }

  /** "En quin any…?" amb anys falsos a prop. */
  async function yearQuestions(
    items: Dated[], prompt: (d: Dated) => string, categoryId: string, tag: string, bump = 0,
  ) {
    const dated = items.filter((d) => d.year !== null);
    const diff = fameRanker(dated);
    for (const item of dated) {
      const [options, correctId] = mcOptions(yearText(item.year!), yearDistractors(item.year!, shuffled));
      if (await upsertQuestion({
        typeSlug: "multiple_choice", categoryId, locale: "ca",
        prompt: prompt(item), payload: { options }, answer: { correctId },
        difficulty: clampDiff(diff(item) + bump), status: "published", tags: tags(tag),
      })) n++;
    }
  }

  /** "En quin segle va néixer X?" */
  async function centuryQuestions(people: Person[], categoryId: string, tag: string) {
    const born = people.filter((p) => p.birth !== null);
    const diff = fameRanker(born);
    const label = (c: number) => (c > 0 ? `segle ${c}` : `segle ${-c} aC`);
    for (const p of born) {
      const century = p.birth! > 0 ? Math.floor((p.birth! - 1) / 100) + 1 : Math.floor(p.birth! / 100) - 1;
      const [options, correctId] = mcOptions(
        label(century),
        shuffled([century - 1, century + 1, century - 2, century + 2].filter((c) => c !== 0 && c <= 21)).slice(0, 3).map(label),
      );
      if (await upsertQuestion({
        typeSlug: "multiple_choice", categoryId, locale: "ca",
        prompt: `En quin segle va néixer ${p.label}?`,
        payload: { options }, answer: { correctId },
        difficulty: clampDiff(diff(p) + 1), status: "published", tags: tags(tag),
      })) n++;
    }
  }

  /** Comparar una xifra entre dos ítems: com més iguals, més difícil. */
  async function comparisons(
    rows: Array<{ label: string; value: number; fame: number }>, metric: string, fmt: (v: number) => string,
    categoryId: string, tag: string, max: number,
  ) {
    const sorted = [...rows].filter((r) => r.value > 0).sort((a, b) => a.value - b.value);
    const diff = fameRanker(sorted);
    const bands = [1.05, 1.4, 2.5, 10];
    let made = 0;
    for (let i = 0; i < sorted.length && made < max; i++) {
      const minRatio = bands[i % bands.length];
      const j = sorted.findIndex((c, k) => k > i && c.value / sorted[i].value >= minRatio);
      if (j <= i) continue;
      const [a, b] = [sorted[i], sorted[j]];
      const [known, hidden] = (i + j) % 2 === 0 ? [a, b] : [b, a];
      const ratio = Math.max(known.value, hidden.value) / Math.min(known.value, hidden.value);
      const byRatio = ratio >= 8 ? 1 : ratio >= 3 ? 2 : ratio >= 1.8 ? 3 : ratio >= 1.25 ? 4 : 5;
      if (await upsertQuestion({
        typeSlug: "higher_lower", categoryId, locale: "ca",
        prompt: `${hidden.label} té més o menys ${metric} que ${known.label}?`,
        payload: { metric, a: { label: known.label, display: fmt(known.value) }, b: { label: hidden.label } },
        answer: { bHigher: hidden.value > known.value, bDisplay: fmt(hidden.value) },
        difficulty: clampDiff((byRatio + Math.max(diff(a), diff(b))) / 2),
        status: "published", tags: tags(tag),
      })) { n++; made++; }
    }
  }

  // ── CIÈNCIA ──────────────────────────────────────────────────────────────
  const elements = wd.elements.filter((e) => e.number <= 103); // fins al lawrenci: la resta són de laboratori
  const elDiff = fameRanker(elements);
  const symbols = elements.map((e) => e.symbol);
  const names = elements.map((e) => e.label);
  for (const e of elements) {
    const [opts1, id1] = mcOptions(e.label, shuffled(names.filter((x) => x !== e.label)).slice(0, 3));
    if (await upsertQuestion({
      typeSlug: "multiple_choice", categoryId: cats.ciencia, locale: "ca",
      prompt: `Quin element químic té el símbol ${e.symbol}?`,
      payload: { options: opts1 }, answer: { correctId: id1 },
      difficulty: elDiff(e), status: "published", tags: tags("elements"),
    })) n++;
    // La direcció contrària només per als coneguts: si no, són desenes de preguntes
    // entre símbols que no ha vist mai ningú.
    if (elDiff(e) <= 3) {
      const [opts2, id2] = mcOptions(e.symbol, shuffled(symbols.filter((x) => x !== e.symbol)).slice(0, 3));
      if (await upsertQuestion({
        typeSlug: "multiple_choice", categoryId: cats.ciencia, locale: "ca",
        prompt: `Quin és el símbol químic de l'element «${e.label}»?`,
        payload: { options: opts2 }, answer: { correctId: id2 },
        difficulty: clampDiff(elDiff(e) + 1), status: "published", tags: tags("elements"),
      })) n++;
    }
  }
  // El nombre atòmic dona per a UNA pregunta, no per a setanta: qui sap on cau un element a
  // la taula els sap tots, i qui no, no en sap cap. Sembrar-ne desenes no mesurava desenes de
  // coses, mesurava la mateixa una i prou, i sortien en ratxa. Per això:
  //
  // - Fora l'estimació «Quin nombre atòmic té X?». Era la forma més injusta del mateix fet: amb
  //   una tolerància del 20%, encertar l'oxigen (8) volia dir clavar-lo entre 7 i 10, mentre que
  //   a l'urani (92) t'hi vaig un marge de divuit protons.
  // - De l'ordenació queden només els salts amples. Ordenar quatre elements consecutius és
  //   memòria de la taula; ordenar-ne quatre de separats es pot deduir, que és el que volem.
  const byNumber = [...elements].sort((a, b) => a.number - b.number);
  for (const spacing of [7, 20]) {
    for (let i = 0; i + 3 * spacing < byNumber.length; i += 2 * spacing) {
      const group = [0, 1, 2, 3].map((k) => byNumber[i + k * spacing]);
      const display = shuffled(group).map((e, idx) => ({ id: String.fromCharCode(97 + idx), text: e.label, number: e.number }));
      const order = [...display].sort((a, b) => a.number - b.number).map((d) => d.id);
      const alpha = group.map((g) => g.label).sort().join(", ");
      const gap = Math.min(...group.slice(1).map((g, k) => g.number - group[k].number));
      if (await upsertQuestion({
        typeSlug: "ordering", categoryId: cats.ciencia, locale: "ca",
        prompt: `Ordena per nombre atòmic (de menor a major): ${alpha}`,
        payload: { items: display.map(({ id, text }) => ({ id, text })), criterion: "de menor a major nombre atòmic" },
        answer: { order },
        difficulty: gap >= 20 ? 2 : gap >= 7 ? 3 : 4,
        status: "published", tags: tags("elements", "ordena"),
      })) n++;
    }
  }
  await comparisons(
    elements.filter((e) => e.mass).map((e) => ({ label: e.label, value: e.mass!, fame: e.fame })),
    "massa atòmica", (v) => `${v.toFixed(1)} u`, cats.ciencia, "elements", 70,
  );

  for (const p of wd.planets.filter((p) => p.period)) {
    if (await upsertQuestion({
      typeSlug: "estimation", categoryId: cats.ciencia, locale: "ca",
      prompt: `Quants dies triga ${p.label} a fer la volta al Sol?`,
      payload: { unit: "dies", min: 0, max: 100000, step: 1, scale: "log" },
      answer: { value: Math.round(p.period!), tolerancePct: 35 },
      difficulty: 3, status: "published", tags: tags("planetes"),
    })) n++;
  }
  await comparisons(
    wd.planets.filter((p) => p.radius).map((p) => ({ label: p.label, value: p.radius!, fame: p.fame })),
    "radi", (v) => `${Math.round(v).toLocaleString("ca")} km`, cats.ciencia, "planetes", 20,
  );

  await centuryQuestions(topBy(wd.scientists, 0.6), cats.ciencia, "cientifics");
  await timelineSets(
    wd.scientists.map((s) => ({ label: s.label, year: s.birth, fame: s.fame })),
    cats.ciencia, "ciencia", "cientifics-timeline", [3, 12, 30],
  );

  // ── HISTÒRIA ─────────────────────────────────────────────────────────────
  // És la categoria més fluixa (tenia 17 preguntes), així que aquí no es retalla res.
  await yearQuestions(wd.events, (e) => `En quin any va passar «${e.label}»?`, cats.historia, "fets");
  await timelineSets(wd.events, cats.historia, "historia", "fets-timeline", [1, 4, 7, 25]);
  await centuryQuestions(wd.leaders, cats.historia, "personatges");
  await comparisons(
    wd.leaders.filter((l) => l.birth !== null && l.death !== null && l.death > l.birth)
      .map((l) => ({ label: l.label, value: l.death! - l.birth!, fame: l.fame })),
    "anys de vida", (v) => `${v} anys`, cats.historia, "personatges", 70,
  );
  await timelineSets(
    wd.leaders.map((l) => ({ label: l.label, year: l.birth, fame: l.fame })),
    cats.historia, "historia", "personatges-timeline", [2, 6, 10, 24],
  );

  // ── CULTURA ──────────────────────────────────────────────────────────────
  await authorship(wd.films, (w) => w.director, (w) => `Qui va dirigir «${w.label}»?`, cats.cultura, "cinema");
  await authorship(wd.paintings, (w) => w.creator, (w) => `Qui va pintar «${w.label}»?`, cats.cultura, "pintura");
  await authorship(topBy(wd.books, 0.7), (w) => w.author, (w) => `Qui va escriure «${w.label}»?`, cats.cultura, "llibres");
  await yearQuestions(wd.films, (f) => `De quin any és la pel·lícula «${f.label}»?`, cats.cultura, "cinema", 1);
  // La data de publicació (P577) d'obres antigues és brossa: sortien coses com
  // "Guerra de les Gàl·lies (any 5)". Es talla a la impremta; abans no és de fiar.
  const printed = <T extends { year: number | null }>(items: T[]) => items.filter((x) => x.year !== null && x.year >= 1400);
  await yearQuestions(topBy(printed(wd.paintings), 0.6), (p) => `De quin any és el quadre «${p.label}»?`, cats.cultura, "pintura", 1);
  await timelineSets(wd.films.map((f) => ({ label: f.label, year: f.year, fame: f.fame })), cats.cultura, "cultura", "cinema-timeline", [1, 3, 8]);
  await timelineSets(printed(wd.books).map((b) => ({ label: b.label, year: b.year, fame: b.fame })), cats.cultura, "cultura", "llibres-timeline", [2, 5, 11, 26]);

  // ── NATURA ───────────────────────────────────────────────────────────────
  // Era la categoria buida (10 preguntes) després de descartar les dades de massa.
  // Aquestes dues sí que són sòlides: a quin grup pertany una espècie i com es diu en
  // llatí. Cap número pel mig, que és on Wikidata falla.
  const taxa = wd.taxa ?? [];
  const groups = [...new Set(taxa.map((t) => t.group))];
  const taxDiff = fameRanker(taxa);
  for (const t of taxa) {
    if (groups.length >= 4) {
      const [options, correctId] = mcOptions(t.group, shuffled(groups.filter((g) => g !== t.group)).slice(0, 3));
      if (await upsertQuestion({
        typeSlug: "multiple_choice", categoryId: cats.natura, locale: "ca",
        prompt: `A quin grup pertany aquest animal: ${t.label}?`,
        payload: { options }, answer: { correctId },
        difficulty: taxDiff(t), status: "published", tags: tags("taxonomia"),
      })) n++;
    }
  }
  // El nom científic, només dels més coneguts: amb distractors del MATEIX grup, perquè
  // no es pugui encertar per l'aspecte del llatí.
  //
  // S'exclouen les espècies que NO tenen nom popular en català (l'etiqueta és el mateix
  // nom científic): l'enunciat portaria la resposta a dins.
  const named = taxa.filter((t) => t.label !== t.taxon);
  for (const t of topBy(named, 0.35)) {
    const sameGroup = taxa.filter((o) => o.group === t.group && o.taxon !== t.taxon).map((o) => o.taxon);
    if (sameGroup.length < 3) continue;
    const [options, correctId] = mcOptions(t.taxon, shuffled(sameGroup).slice(0, 3));
    if (await upsertQuestion({
      typeSlug: "multiple_choice", categoryId: cats.natura, locale: "ca",
      prompt: `Quin és el nom científic de ${t.label}?`,
      payload: { options }, answer: { correctId },
      difficulty: clampDiff(taxDiff(t) + 1), status: "published", tags: tags("taxonomia", "nom-cientific"),
    })) n++;
  }
  for (const t of topBy(named, 0.2)) {
    const others = named.filter((o) => o.group === t.group && o.label !== t.label).map((o) => o.label);
    if (others.length < 3) continue;
    const [options, correctId] = mcOptions(t.label, shuffled(others).slice(0, 3));
    if (await upsertQuestion({
      typeSlug: "multiple_choice", categoryId: cats.natura, locale: "ca",
      prompt: `Quin animal és «${t.taxon}»?`,
      payload: { options }, answer: { correctId },
      difficulty: clampDiff(taxDiff(t) + 1), status: "published", tags: tags("taxonomia", "nom-cientific"),
    })) n++;
  }

  return n;
}
