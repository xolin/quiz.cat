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
interface Album { label: string; performer: string; year: number | null; fame: number }
/** Grups musicals i clubs esportius: mateixa forma, mateixes preguntes (any i país). */
interface Founded { label: string; year: number | null; country: string | null; fame: number }
interface Athlete { label: string; sport: string; birth: number | null; occupation: string; fame: number }
interface Municipi { label: string; pop: number | null; comarca: string | null; lat: number | null; lon: number | null; fame: number }
interface Comarca { label: string; pop: number | null; area: number | null; capital: string | null; fame: number }
interface RegionCity { label: string; pop: number | null; lat: number | null; lon: number | null; fame: number }

/**
 * Seccions regionals d'Europa: nacions sense estat i països amb què el públic català té
 * afinitat. `center`/`zoom` enquadren el mapa a la regió i `km` és el marge d'encert —
 * tots dos han d'anar lligats a la mida real del lloc: 40 km a Brussel·les seria tota la
 * regió, i 5 km a Ucraïna seria impossible.
 */
const REGIONS: Array<{ slug: string; name: string; icon: string; center: [number, number]; zoom: number; km: number }> = [
  { slug: "euskalherria", name: "Euskal Herria", icon: "🏔️", center: [43.0, -2.2], zoom: 8, km: 15 },
  { slug: "galicia", name: "Galícia", icon: "🐙", center: [42.8, -8.0], zoom: 8, km: 20 },
  { slug: "occitania", name: "Occitània", icon: "🌾", center: [43.8, 2.0], zoom: 7, km: 25 },
  { slug: "brusselles", name: "Brussel·les", icon: "🏛️", center: [50.85, 4.35], zoom: 11, km: 3 },
  { slug: "franca", name: "França", icon: "🥖", center: [46.6, 2.4], zoom: 6, km: 45 },
  { slug: "italia", name: "Itàlia", icon: "🍝", center: [42.5, 12.5], zoom: 6, km: 45 },
  { slug: "alemanya", name: "Alemanya", icon: "🍺", center: [51.2, 10.4], zoom: 6, km: 45 },
  { slug: "paisosbaixos", name: "Països Baixos", icon: "🌷", center: [52.2, 5.3], zoom: 7, km: 25 },
  { slug: "suecia", name: "Suècia", icon: "🌲", center: [62.0, 15.0], zoom: 5, km: 60 },
  { slug: "noruega", name: "Noruega", icon: "⛰️", center: [64.5, 12.0], zoom: 5, km: 60 },
  { slug: "suissa", name: "Suïssa", icon: "🏔️", center: [46.8, 8.2], zoom: 7, km: 20 },
  { slug: "austria", name: "Àustria", icon: "🎻", center: [47.6, 14.1], zoom: 7, km: 25 },
  { slug: "txequia", name: "Txèquia", icon: "🍻", center: [49.8, 15.5], zoom: 7, km: 25 },
  { slug: "ucraina", name: "Ucraïna", icon: "🌻", center: [48.4, 31.2], zoom: 5, km: 60 },
];

/**
 * Ciutats mínimes per obrir una secció. Una temàtica amb quatre preguntes és pitjor que
 * no tenir-la: la pantalla la deixa triar i després la partida no la pot respectar, perquè
 * `selection.ts` només s'hi centra si hi ha prou contingut per omplir la partida sencera.
 * Amb cinc ciutats surten unes quinze preguntes (mapa + comparació + estimació), que ja
 * omplen la partida.
 */
const MIN_CITIES = 5;

/**
 * Terra de població RELATIU a la ciutat més gran de la regió.
 *
 * Absolut no serveix: 20.000 habitants és un poble perdut a Alemanya i una ciutat mitjana
 * a Occitània. El filtre de fama de Wikidata tampoc no ho resol —a Occitània deixava passar
 * Aucamvila (10.000) i la Sauvetat Sent Gili (9.000) al costat de Tolosa i Montpeller—, i
 * «on és la Sauvetat Sent Gili?» no és una pregunta difícil, és una pregunta impossible.
 */
const CITY_FLOOR_RATIO = 0.03;

interface Manifest {
  elements: Element[]; planets: Planet[]; scientists: Person[];
  events: Dated[]; leaders: Person[]; films: Work[]; paintings: Work[]; books: Work[]; taxa: Taxon[];
  // Opcionals: un manifest baixat abans d'afegir-los no els porta, i el seed ha de tirar igual.
  musicians?: Person[]; albums?: Album[]; bands?: Founded[];
  athletes?: Athlete[]; clubs?: Founded[];
  municipis?: Municipi[]; comarques?: Comarca[];
  regionCities?: Record<string, RegionCity[]>;
}

export interface WikidataCtx {
  prisma: PrismaClient;
  cats: { ciencia: string; historia: string; cultura: string; natura: string; geografia: string };
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

  /**
   * "Qui va fer X?" — pel·lícules, quadres i llibres segueixen el mateix patró.
   *
   * És genèrica perquè la forma («una entitat, un atribut de text, distractors del mateix
   * conjunt») serveix per a molt més que l'autoria: el país d'un grup, la comarca d'un
   * municipi o l'esport d'un esportista són exactament la mateixa pregunta.
   */
  async function authorship<T extends { label: string; fame: number }>(
    works: T[], authorOf: (w: T) => string | undefined | null, prompt: (w: T) => string,
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
    categoryId: string, tag: string, max: number, topicSlug?: string,
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
        status: "published", topicSlug, tags: tags(tag),
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

  // ── MÚSICA (cultura) ─────────────────────────────────────────────────────
  // Era el forat més gran: zero preguntes de música en un joc de trivia. Els percentils
  // són deliberadament curts — amb tot el dataset, la música sola seria un terç del pou.
  const albums = wd.albums ?? [];
  const musicians = wd.musicians ?? [];
  const bands = wd.bands ?? [];
  await authorship(topBy(albums, 0.6), (a) => a.performer, (a) => `Qui va publicar l'àlbum «${a.label}»?`, cats.cultura, "musica");
  await yearQuestions(topBy(albums, 0.3), (a) => `De quin any és l'àlbum «${a.label}»?`, cats.cultura, "musica", 1);
  await centuryQuestions(topBy(musicians, 0.4), cats.cultura, "musics");
  await yearQuestions(topBy(bands, 0.6), (b) => `En quin any es va formar el grup ${b.label}?`, cats.cultura, "musica", 1);
  await authorship(topBy(bands, 0.7), (b) => b.country, (b) => `De quin país és el grup ${b.label}?`, cats.cultura, "musica");
  await timelineSets(
    albums.map((a) => ({ label: a.label, year: a.year, fame: a.fame })),
    cats.cultura, "cultura", "musica-timeline", [4, 12],
  );

  // ── ESPORT (cultura, etiquetat `esport`) ─────────────────────────────────
  // Va a Cultura perquè no hi ha categoria pròpia: crear-ne una demana color, icona i
  // retocs al sistema de disseny. L'etiqueta `esport` deixa fer-ho més endavant sense
  // haver de tornar a generar res.
  const athletes = wd.athletes ?? [];
  const clubs = wd.clubs ?? [];
  // "Va destacar" i no "practica": una part bona d'aquesta llista ja és morta.
  //
  // Retallat al 45%: el dataset en dona 1028, i mil preguntes de la mateixa forma serien
  // el mateix error que el nombre atòmic — no per repetir el fet (saber a què jugava Messi
  // no et diu l'esport de ningú més), sinó per repetir el MOTLLE fins a fer-lo previsible.
  await authorship(topBy(athletes, 0.45), (a) => a.sport, (a) => `En quin esport va destacar ${a.label}?`, cats.cultura, "esport");
  // Retallats: sense filtre sortien clubs com el «FK Kauno Žalgiris», i «de quin país és»
  // deixa de ser difícil per passar a ser impossible — no és coneixement, és sort.
  await yearQuestions(topBy(clubs, 0.6), (c) => `En quin any es va fundar el ${c.label}?`, cats.cultura, "esport", 1);
  await authorship(topBy(clubs, 0.55), (c) => c.country, (c) => `De quin país és el club ${c.label}?`, cats.cultura, "esport");
  await timelineSets(
    athletes.map((a) => ({ label: a.label, year: a.birth, fame: a.fame })),
    cats.cultura, "cultura", "esport-timeline", [8, 25],
  );

  // ── CATALUNYA (geografia) ────────────────────────────────────────────────
  // El diferencial del joc: contingut que cap altre trivia genera.
  //
  // Nota sobre la dificultat: aquí NO es fa servir `fame` (nombre de wikis). Entre pobles
  // catalans amb prou feines discrimina — Vic i la Vajol tenen wikis semblants —, mentre que
  // la POBLACIÓ sí que diu quins coneix la gent. Per això es passa `fame: pop`.
  const municipis = (wd.municipis ?? []).filter((m) => m.pop && m.pop > 0);
  const byPop = [...municipis].sort((a, b) => b.pop! - a.pop!);
  const asKnown = (m: Municipi) => ({ label: m.label, value: m.pop!, fame: m.pop! });

  await authorship(
    byPop.slice(0, 220).map((m) => ({ label: m.label, comarca: m.comarca, fame: m.pop! })),
    (m) => m.comarca, (m) => `A quina comarca pertany ${m.label}?`, cats.geografia, "catalunya",
  );
  // La dificultat es calcula UN COP i es desa per nom. `fameRanker` indexa per identitat
  // d'objecte, o sigui que cridar-lo amb un `{...}` acabat de fer sempre falla el `get` i
  // torna el valor del mig: totes les preguntes sortirien amb la mateixa dificultat.
  const popTop = byPop.slice(0, 220);
  const popRows = popTop.map(asKnown);
  const rankPop = fameRanker(popRows);
  const popDiff = new Map(popTop.map((m, i) => [m.label, rankPop(popRows[i])]));

  for (const m of byPop.slice(0, 120)) {
    if (await upsertQuestion({
      typeSlug: "estimation", categoryId: cats.geografia, locale: "ca",
      prompt: `Quants habitants té ${m.label}?`,
      payload: { unit: "habitants", min: 0, max: 2000000, step: 1, scale: "log" },
      answer: { value: m.pop!, tolerancePct: 35 },
      difficulty: clampDiff((popDiff.get(m.label) ?? 3) + 1), status: "published", tags: tags("catalunya"),
    })) n++;
  }
  await comparisons(
    byPop.slice(0, 200).map(asKnown), "població",
    (v) => `${Math.round(v).toLocaleString("ca")} habitants`, cats.geografia, "catalunya", 90,
  );
  // Mapa centrat a Catalunya i amb zoom de comarca. Amb la vista del món (que és el que
  // feia el mapa fins ara, ignorant el `payload`), situar Manresa seria clicar dos píxels.
  for (const m of byPop.slice(0, 90).filter((m) => m.lat !== null && m.lon !== null)) {
    if (await upsertQuestion({
      typeSlug: "map_guess", categoryId: cats.geografia, locale: "ca",
      prompt: `On és ${m.label}? Clica al mapa`,
      payload: { center: [41.8, 1.7], zoom: 8, maxZoom: 12 },
      answer: { lat: m.lat, lng: m.lon, toleranceKm: 20 },
      difficulty: clampDiff((popDiff.get(m.label) ?? 3) + 1), status: "published", tags: tags("catalunya", "mapa"),
    })) n++;
  }

  const comarques = wd.comarques ?? [];
  // Preguntada al revés a posta. «La capital de la comarca Barcelonès» és incorrecte —les
  // comarques porten article ("el Barcelonès", "l'Alt Empordà") i Wikidata no el dona, o sigui
  // que qualsevol frase que hi encaixi el nom directament grinyola. Amb la capital al davant
  // la frase funciona amb tots els noms, i de passada la pregunta és millor: saps on és Vic,
  // però potser no de quina comarca és capital.
  await authorship(comarques.filter((c) => c.capital), (c) => c.label, (c) => `De quina comarca és capital ${c.capital}?`, cats.geografia, "catalunya");
  await comparisons(
    comarques.filter((c) => c.area).map((c) => ({ label: c.label, value: c.area!, fame: c.pop ?? c.fame })),
    "superfície", (v) => `${Math.round(v).toLocaleString("ca")} km²`, cats.geografia, "catalunya", 40,
  );

  // ── SECCIONS REGIONALS D'EUROPA (geografia) ──────────────────────────────
  // Cada regió és una temàtica triable, i **el tema només es crea si té contingut**. Una
  // secció buida no és neutra: apareix a la pantalla, es deixa triar, i després la partida
  // no la respecta perquè `selection.ts` només s'hi centra si pot omplir la partida sencera.
  // Val més que no hi surti.
  const regionCities = wd.regionCities ?? {};
  for (const [i, r] of REGIONS.entries()) {
    const withData = (regionCities[r.slug] ?? []).filter((c) => c.pop && c.lat !== null && c.lon !== null);
    const biggest = Math.max(0, ...withData.map((c) => c.pop!));
    const cities = withData.filter((c) => c.pop! >= biggest * CITY_FLOOR_RATIO);
    if (cities.length < MIN_CITIES) continue;

    const sortOrder = 30 + i;
    await prisma.topic.upsert({
      where: { slug: r.slug },
      update: { name: r.name, icon: r.icon, kind: "region", sortOrder },
      create: { slug: r.slug, name: r.name, icon: r.icon, kind: "region", regions: [], sortOrder },
    });

    const byPopulation = [...cities].sort((a, b) => b.pop! - a.pop!);
    const rows = byPopulation.map((c) => ({ label: c.label, value: c.pop!, fame: c.pop! }));
    const rank = fameRanker(rows);
    const cityDiff = new Map(byPopulation.map((c, k) => [c.label, rank(rows[k])]));

    // El mapa és el que fa que aquestes seccions valguin la pena: enquadrat a la regió,
    // situar Tolosa o Bilbao és geografia de debò i no punteria sobre un mapamundi.
    for (const c of byPopulation) {
      if (await upsertQuestion({
        typeSlug: "map_guess", categoryId: cats.geografia, locale: "ca",
        prompt: `On és ${c.label}? Clica al mapa`,
        payload: { center: r.center, zoom: r.zoom, maxZoom: r.zoom + 4 },
        answer: { lat: c.lat, lng: c.lon, toleranceKm: r.km },
        difficulty: clampDiff((cityDiff.get(c.label) ?? 3) + 1),
        status: "published", topicSlug: r.slug, tags: tags("regio", r.slug, "mapa"),
      })) n++;
    }
    await comparisons(
      rows, "població", (v) => `${Math.round(v).toLocaleString("ca")} habitants`,
      cats.geografia, `regio-${r.slug}`, 40, r.slug,
    );
    for (const c of byPopulation.slice(0, 25)) {
      if (await upsertQuestion({
        typeSlug: "estimation", categoryId: cats.geografia, locale: "ca",
        prompt: `Quants habitants té ${c.label}?`,
        payload: { unit: "habitants", min: 0, max: 4000000, step: 1, scale: "log" },
        answer: { value: c.pop!, tolerancePct: 40 },
        difficulty: clampDiff((cityDiff.get(c.label) ?? 3) + 2),
        status: "published", topicSlug: r.slug, tags: tags("regio", r.slug),
      })) n++;
    }
  }

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
