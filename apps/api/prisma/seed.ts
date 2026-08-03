import { PrismaClient } from "@prisma/client";
import { seedWikidata } from "./wikidata-questions.js";
import { QUESTION_TYPES } from "@quizcat/shared";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** UUID determinista des d'una clau (perquè el seed sigui idempotent sense duplicar mèdia). */
function stableMediaId(key: string): string {
  const h = crypto.createHash("md5").update("quizcat-media:" + key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// Població (milions d'hab.) i superfície (milers de km²) per al tipus "més o menys".
// Dades aproximades ~2023 (fets d'ús lliure).
const STATS: Record<string, { pop: number; area: number }> = {
  Espanya: { pop: 47, area: 506 }, França: { pop: 68, area: 552 }, Itàlia: { pop: 59, area: 301 },
  Portugal: { pop: 10, area: 92 }, Alemanya: { pop: 84, area: 358 }, "Regne Unit": { pop: 67, area: 244 },
  Grècia: { pop: 10.4, area: 132 }, "Països Baixos": { pop: 17.8, area: 42 }, Suïssa: { pop: 8.8, area: 41 },
  Àustria: { pop: 9, area: 84 }, Polònia: { pop: 38, area: 313 }, Suècia: { pop: 10.5, area: 450 },
  Noruega: { pop: 5.4, area: 385 }, Dinamarca: { pop: 5.9, area: 43 }, Finlàndia: { pop: 5.5, area: 338 },
  Irlanda: { pop: 5.1, area: 70 }, Hongria: { pop: 9.6, area: 93 }, Txèquia: { pop: 10.5, area: 79 },
  Romania: { pop: 19, area: 238 }, Croàcia: { pop: 3.9, area: 57 }, Ucraïna: { pop: 41, area: 604 },
  Turquia: { pop: 85, area: 784 }, Japó: { pop: 125, area: 378 }, Xina: { pop: 1412, area: 9597 },
  Índia: { pop: 1417, area: 3287 }, "Corea del Sud": { pop: 51, area: 100 }, Tailàndia: { pop: 72, area: 513 },
  Vietnam: { pop: 98, area: 331 }, Indonèsia: { pop: 275, area: 1905 }, "Aràbia Saudita": { pop: 36, area: 2150 },
  Egipte: { pop: 111, area: 1002 }, Marroc: { pop: 37, area: 447 }, "Sud-àfrica": { pop: 60, area: 1221 },
  Nigèria: { pop: 218, area: 924 }, Kenya: { pop: 54, area: 580 }, "Estats Units": { pop: 333, area: 9834 },
  Canadà: { pop: 39, area: 9985 }, Mèxic: { pop: 128, area: 1964 }, Brasil: { pop: 215, area: 8516 },
  Argentina: { pop: 46, area: 2780 }, Xile: { pop: 19.6, area: 756 }, Austràlia: { pop: 26, area: 7692 },
  "Nova Zelanda": { pop: 5.1, area: 268 },
};

// Clips de veu per varietat dialectal (download-accents.mjs). Àudio CC0 de Common Voice,
// etiquetes de varietat del Projecte AINA (CC BY 4.0). Sense cap dada del parlant.
interface AccentClip {
  file: string; accent: string; label: string; gender: string;
  sentence: string; durationMs: number; license: string; attribution: string; source: string;
}
const ACCENT_CLIPS: AccentClip[] = (() => {
  const p = path.join(__dirname, "accents-manifest.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
})();

// Com de difícil és reconèixer cada varietat (el central i el septentrional s'assemblen molt).
const ACCENT_DIFFICULTY: Record<string, number> = {
  valencian: 2, balearic: 2, northwestern: 3, central: 3, northern: 4,
};

// Clips d'instruments (download-instruments.mjs). VCSL (CC0) + TinySOL (CC BY 4.0).
interface InstrumentClip {
  file: string; slug: string; label: string; family: string;
  license: string; attribution: string; source: string;
}
const INSTRUMENT_CLIPS: InstrumentClip[] = (() => {
  const p = path.join(__dirname, "instruments-manifest.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
})();

// Clips de llengües (download-languages.mjs). Mateixa font i drets que els accents.
interface LanguageClip {
  file: string; locale: string; label: string; group: string;
  difficulty: number; license: string; attribution: string; source: string;
}
const LANGUAGE_CLIPS: LanguageClip[] = (() => {
  const p = path.join(__dirname, "languages-manifest.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
})();

interface MysteryItem {
  file: string; label: string; group: string; source: string;
  license: string; licenseUrl: string | null; author: string | null;
}
const MYSTERY: MysteryItem[] = (() => {
  const p = path.join(__dirname, "mystery-manifest.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
})();

const TYPE_NAMES: Record<string, string> = {
  multiple_choice: "Opció múltiple",
  text_input: "Resposta escrita",
  audio_clip: "Clip d'àudio",
  image_guess: "Endevina la imatge",
  map_guess: "Situa al mapa",
  ordering: "Ordena-ho",
  silhouette: "Silueta",
};

// Siluetes (contorns) generades per build-silhouettes.mjs des de Natural Earth (domini públic).
interface Silhouette { path: string; w: number; h: number; label: string }
const SILHOUETTES: Record<string, Silhouette> = (() => {
  const p = path.join(__dirname, "silhouette-manifest.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")).shapes : {};
})();

// Comunitats autònomes amb silueta pròpia (clau del manifest → etiqueta i dificultat).
const CCAA: Array<{ key: string; label: string; difficulty: number }> = [
  { key: "es-catalunya", label: "Catalunya", difficulty: 2 },
  { key: "es-balears", label: "Illes Balears", difficulty: 2 },
  { key: "es-canaries", label: "Canàries", difficulty: 2 },
  { key: "es-galicia", label: "Galícia", difficulty: 3 },
  { key: "es-andalusia", label: "Andalusia", difficulty: 3 },
  { key: "es-pais-valencia", label: "País Valencià", difficulty: 3 },
  { key: "es-arago", label: "Aragó", difficulty: 4 },
  { key: "es-pais-basc", label: "País Basc", difficulty: 4 },
  { key: "es-navarra", label: "Navarra", difficulty: 4 },
  { key: "es-madrid", label: "Madrid", difficulty: 4 },
  { key: "es-murcia", label: "Múrcia", difficulty: 4 },
  { key: "es-astories", label: "Astúries", difficulty: 4 },
  { key: "es-extremadura", label: "Extremadura", difficulty: 4 },
  { key: "es-castella-i-lleo", label: "Castella i Lleó", difficulty: 4 },
  { key: "es-castella-la-manxa", label: "Castella-la Manxa", difficulty: 4 },
  { key: "es-cantabria", label: "Cantàbria", difficulty: 5 },
  { key: "es-rioja", label: "La Rioja", difficulty: 5 },
];

// Dataset de països: dades lliures. Alimenta la GENERACIÓ de preguntes (i, a futur, skins del match-3).
const COUNTRIES: Array<{ label: string; cc: string; capital: string; lat: number; lng: number; continent: string; difficulty: number }> = [
  { label: "Espanya", cc: "es", capital: "Madrid", lat: 40.4168, lng: -3.7038, continent: "Europa", difficulty: 1 },
  { label: "França", cc: "fr", capital: "París", lat: 48.8566, lng: 2.3522, continent: "Europa", difficulty: 1 },
  { label: "Itàlia", cc: "it", capital: "Roma", lat: 41.9028, lng: 12.4964, continent: "Europa", difficulty: 1 },
  { label: "Portugal", cc: "pt", capital: "Lisboa", lat: 38.7223, lng: -9.1393, continent: "Europa", difficulty: 1 },
  { label: "Alemanya", cc: "de", capital: "Berlín", lat: 52.52, lng: 13.405, continent: "Europa", difficulty: 1 },
  { label: "Regne Unit", cc: "gb", capital: "Londres", lat: 51.5074, lng: -0.1278, continent: "Europa", difficulty: 1 },
  { label: "Grècia", cc: "gr", capital: "Atenes", lat: 37.9838, lng: 23.7275, continent: "Europa", difficulty: 2 },
  { label: "Països Baixos", cc: "nl", capital: "Amsterdam", lat: 52.3676, lng: 4.9041, continent: "Europa", difficulty: 2 },
  { label: "Suïssa", cc: "ch", capital: "Berna", lat: 46.948, lng: 7.4474, continent: "Europa", difficulty: 3 },
  { label: "Àustria", cc: "at", capital: "Viena", lat: 48.2082, lng: 16.3738, continent: "Europa", difficulty: 2 },
  { label: "Polònia", cc: "pl", capital: "Varsòvia", lat: 52.2297, lng: 21.0122, continent: "Europa", difficulty: 2 },
  { label: "Suècia", cc: "se", capital: "Estocolm", lat: 59.3293, lng: 18.0686, continent: "Europa", difficulty: 2 },
  { label: "Noruega", cc: "no", capital: "Oslo", lat: 59.9139, lng: 10.7522, continent: "Europa", difficulty: 2 },
  { label: "Dinamarca", cc: "dk", capital: "Copenhaguen", lat: 55.6761, lng: 12.5683, continent: "Europa", difficulty: 2 },
  { label: "Finlàndia", cc: "fi", capital: "Hèlsinki", lat: 60.1699, lng: 24.9384, continent: "Europa", difficulty: 3 },
  { label: "Irlanda", cc: "ie", capital: "Dublín", lat: 53.3498, lng: -6.2603, continent: "Europa", difficulty: 2 },
  { label: "Hongria", cc: "hu", capital: "Budapest", lat: 47.4979, lng: 19.0402, continent: "Europa", difficulty: 2 },
  { label: "Txèquia", cc: "cz", capital: "Praga", lat: 50.0755, lng: 14.4378, continent: "Europa", difficulty: 2 },
  { label: "Romania", cc: "ro", capital: "Bucarest", lat: 44.4268, lng: 26.1025, continent: "Europa", difficulty: 3 },
  { label: "Croàcia", cc: "hr", capital: "Zagreb", lat: 45.815, lng: 15.9819, continent: "Europa", difficulty: 3 },
  { label: "Ucraïna", cc: "ua", capital: "Kíiv", lat: 50.4501, lng: 30.5234, continent: "Europa", difficulty: 2 },
  { label: "Turquia", cc: "tr", capital: "Ankara", lat: 39.9334, lng: 32.8597, continent: "Àsia", difficulty: 3 },
  { label: "Japó", cc: "jp", capital: "Tòquio", lat: 35.6762, lng: 139.6503, continent: "Àsia", difficulty: 1 },
  { label: "Xina", cc: "cn", capital: "Pequín", lat: 39.9042, lng: 116.4074, continent: "Àsia", difficulty: 1 },
  { label: "Índia", cc: "in", capital: "Nova Delhi", lat: 28.6139, lng: 77.209, continent: "Àsia", difficulty: 2 },
  { label: "Corea del Sud", cc: "kr", capital: "Seül", lat: 37.5665, lng: 126.978, continent: "Àsia", difficulty: 2 },
  { label: "Tailàndia", cc: "th", capital: "Bangkok", lat: 13.7563, lng: 100.5018, continent: "Àsia", difficulty: 2 },
  { label: "Vietnam", cc: "vn", capital: "Hanoi", lat: 21.0285, lng: 105.8542, continent: "Àsia", difficulty: 3 },
  { label: "Indonèsia", cc: "id", capital: "Jakarta", lat: -6.2088, lng: 106.8456, continent: "Àsia", difficulty: 3 },
  { label: "Aràbia Saudita", cc: "sa", capital: "Riad", lat: 24.7136, lng: 46.6753, continent: "Àsia", difficulty: 3 },
  { label: "Egipte", cc: "eg", capital: "El Caire", lat: 30.0444, lng: 31.2357, continent: "Àfrica", difficulty: 2 },
  { label: "Marroc", cc: "ma", capital: "Rabat", lat: 34.0209, lng: -6.8416, continent: "Àfrica", difficulty: 3 },
  { label: "Sud-àfrica", cc: "za", capital: "Pretòria", lat: -25.7479, lng: 28.2293, continent: "Àfrica", difficulty: 4 },
  { label: "Nigèria", cc: "ng", capital: "Abuja", lat: 9.0765, lng: 7.3986, continent: "Àfrica", difficulty: 4 },
  { label: "Kenya", cc: "ke", capital: "Nairobi", lat: -1.2921, lng: 36.8219, continent: "Àfrica", difficulty: 3 },
  { label: "Estats Units", cc: "us", capital: "Washington DC", lat: 38.9072, lng: -77.0369, continent: "Amèrica", difficulty: 1 },
  { label: "Canadà", cc: "ca", capital: "Ottawa", lat: 45.4215, lng: -75.6972, continent: "Amèrica", difficulty: 3 },
  { label: "Mèxic", cc: "mx", capital: "Ciutat de Mèxic", lat: 19.4326, lng: -99.1332, continent: "Amèrica", difficulty: 2 },
  { label: "Brasil", cc: "br", capital: "Brasília", lat: -15.8267, lng: -47.9218, continent: "Amèrica", difficulty: 3 },
  { label: "Argentina", cc: "ar", capital: "Buenos Aires", lat: -34.6037, lng: -58.3816, continent: "Amèrica", difficulty: 2 },
  { label: "Xile", cc: "cl", capital: "Santiago", lat: -33.4489, lng: -70.6693, continent: "Amèrica", difficulty: 3 },
  { label: "Austràlia", cc: "au", capital: "Canberra", lat: -35.2809, lng: 149.13, continent: "Oceania", difficulty: 3 },
  { label: "Nova Zelanda", cc: "nz", capital: "Wellington", lat: -41.2865, lng: 174.7762, continent: "Oceania", difficulty: 3 },
];

/** Bandera emoji des del codi ISO alpha-2 (🇪🇸 = zero assets, zero drets). */
function flagEmoji(cc: string): string {
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

// Preguntes fetes a mà per a la barreja de categories.
const HANDMADE: Array<{ category: string; prompt: string; options: string[]; correct: number; difficulty?: number }> = [
  { category: "historia", prompt: "En quin any va caure el mur de Berlín?", options: ["1989", "1991", "1985", "1979"], correct: 0 },
  { category: "historia", prompt: "Qui va ser el primer president dels Estats Units?", options: ["George Washington", "Abraham Lincoln", "Thomas Jefferson", "John Adams"], correct: 0 },
  { category: "historia", prompt: "L'Imperi Romà d'Occident va caure l'any…", options: ["476", "312", "800", "1054"], correct: 0, difficulty: 3 },
  { category: "historia", prompt: "Quina civilització va construir Machu Picchu?", options: ["Inca", "Asteca", "Maia", "Olmeca"], correct: 0 },
  { category: "historia", prompt: "En quin any va arribar l'ésser humà a la Lluna per primer cop?", options: ["1969", "1965", "1972", "1959"], correct: 0 },
  { category: "historia", prompt: "Qui va pintar el sostre de la Capella Sixtina?", options: ["Miquel Àngel", "Leonardo da Vinci", "Rafael", "Botticelli"], correct: 0 },
  { category: "ciencia", prompt: "Quin és el símbol químic de l'or?", options: ["Au", "Ag", "Or", "Go"], correct: 0 },
  { category: "ciencia", prompt: "Quants ossos té el cos humà adult?", options: ["206", "186", "226", "256"], correct: 0, difficulty: 3 },
  { category: "ciencia", prompt: "Quin planeta és conegut com el planeta vermell?", options: ["Mart", "Venus", "Júpiter", "Mercuri"], correct: 0 },
  { category: "ciencia", prompt: "Quin element té el número atòmic 1?", options: ["Hidrogen", "Heli", "Oxigen", "Carboni"], correct: 0 },
  { category: "ciencia", prompt: "Quina és la velocitat de la llum (aprox.)?", options: ["300.000 km/s", "150.000 km/s", "1.000.000 km/s", "30.000 km/s"], correct: 0 },
  { category: "ciencia", prompt: "L'ADN té forma de…", options: ["Doble hèlix", "Espiral simple", "Anell", "Cadena plana"], correct: 0 },
  // Cert o fals: MC de 2 opcions — rondes ràpides, zero fricció.
  { category: "ciencia", prompt: "Cert o fals: els ratpenats són cecs", options: ["Fals", "Cert"], correct: 0 },
  { category: "ciencia", prompt: "Cert o fals: la Gran Muralla xinesa es veu des de l'espai a ull nu", options: ["Fals", "Cert"], correct: 0 },
  { category: "geografia", prompt: "Cert o fals: Àfrica és més gran que la Lluna en superfície", options: ["Fals", "Cert"], correct: 0, difficulty: 3 },
  { category: "geografia", prompt: "Cert o fals: el riu més llarg d'Europa és el Volga", options: ["Cert", "Fals"], correct: 0 },
  { category: "historia", prompt: "Cert o fals: Cleòpatra va viure més a prop de l'arribada a la Lluna que de la construcció de les piràmides de Gizeh", options: ["Cert", "Fals"], correct: 0, difficulty: 3 },
  { category: "historia", prompt: "Cert o fals: la Primera Guerra Mundial va començar el 1914", options: ["Cert", "Fals"], correct: 0 },
  { category: "ciencia", prompt: "Cert o fals: el so viatja més ràpid a l'aigua que a l'aire", options: ["Cert", "Fals"], correct: 0 },
  { category: "geografia", prompt: "Cert o fals: Istanbul és la capital de Turquia", options: ["Fals", "Cert"], correct: 0 },
  // L'intrús: quina no encaixa.
  { category: "geografia", prompt: "Quin d'aquests països NO és a Europa?", options: ["Armènia", "Portugal", "Hongria", "Croàcia"], correct: 0, difficulty: 3 },
  { category: "ciencia", prompt: "Quin d'aquests NO és un gas noble?", options: ["Nitrogen", "Heli", "Neó", "Argó"], correct: 0 },
  { category: "historia", prompt: "Quin d'aquests personatges NO és del segle XX?", options: ["Napoleó", "Churchill", "Gandhi", "Kennedy"], correct: 0 },
  { category: "geografia", prompt: "Quina d'aquestes ciutats NO és una capital?", options: ["Sydney", "Ottawa", "Canberra", "Wellington"], correct: 0 },
  { category: "ciencia", prompt: "Quin d'aquests planetes NO té anells?", options: ["Mart", "Saturn", "Júpiter", "Urà"], correct: 0 },
  { category: "historia", prompt: "Quina d'aquestes civilitzacions NO és americana?", options: ["Sumèria", "Inca", "Maia", "Asteca"], correct: 0 },
];

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── MODEL DE DIFICULTAT ─────────────────────────────────────────────────────
// La dificultat ha de sortir de la DADA (com de distingible és la resposta), no d'un
// número fix per mecànica. Amb dificultats fixes, mecàniques senceres es quedaven totes
// al mateix nivell (estimació i més-o-menys, totes a 3) i el mode adaptatiu no tenia
// material ni per als principiants ni per als experts.
const clampDiff = (d: number) => Math.max(1, Math.min(5, Math.round(d)));

/** Com de conegut és un país (1 = el coneix tothom). Ve del mateix dataset. */
const fame = (label: string) => COUNTRIES.find((c) => c.label === label)?.difficulty ?? 3;

/** Comparar dues xifres: com més iguals, més difícil. */
function ratioDifficulty(a: number, b: number): number {
  const r = a > b ? a / b : b / a;
  if (r >= 8) return 1; // Xina vs Portugal: no cal saber-ne res
  if (r >= 3) return 2;
  if (r >= 1.8) return 3;
  if (r >= 1.25) return 4;
  return 5; // gairebé iguals: cal saber-ho de debò
}

/** Ordenar coses: com més juntes estan, més difícil. `gap` = separació mínima entre veïnes. */
function gapDifficulty(gap: number, unit: "graus" | "anys"): number {
  const t = unit === "graus" ? [15, 8, 4, 2] : [300, 80, 25, 10];
  if (gap >= t[0]) return 1;
  if (gap >= t[1]) return 2;
  if (gap >= t[2]) return 3;
  if (gap >= t[3]) return 4;
  return 5;
}

/** Opcions barrejades amb la correcta inclosa; retorna [options, correctId]. */
function mcOptions(correct: string, distractors: string[]): [{ id: string; text: string }[], string] {
  const opts = shuffled([correct, ...distractors.slice(0, 3)]).map((text, i) => ({
    id: String.fromCharCode(97 + i),
    text,
  }));
  const correctId = opts.find((o) => o.text === correct)!.id;
  return [opts, correctId];
}

/**
 * Famílies de preguntes retirades del generador, per prefix de prompt.
 *
 * Cal una llista explícita perquè `upsertQuestion` no esborra mai: treure un generador no
 * treu de la base el que ja havia sembrat, i aquelles preguntes es quedarien publicades per
 * sempre. Es retiren aquí, i les que el generador encara vulgui tornen soles a `published`
 * quan hi passen — o sigui que desfer una poda és treure la línia d'aquesta llista.
 */
const RETIRED_PROMPT_PREFIXES = [
  // El nombre atòmic es preguntava de tres maneres i totes demanaven el mateix: qui sap on cau
  // un element a la taula els sap tots. Queden només les ordenacions de salt ample, que es
  // poden deduir. Veure el bloc de CIÈNCIA de `wikidata-questions.ts`.
  "Quin nombre atòmic té ",
  "Ordena per nombre atòmic",
];

async function retireDroppedFamilies() {
  for (const prefix of RETIRED_PROMPT_PREFIXES) {
    const { count } = await prisma.question.updateMany({
      where: { prompt: { startsWith: prefix }, status: "published" },
      data: { status: "retired" },
    });
    if (count) console.log(`  · retirades ${count} preguntes «${prefix}…»`);
  }
}

/**
 * Crea la pregunta només si no existeix ja (idempotent per prompt+tipus).
 * Si ja hi és però el generador ara li dona una DIFICULTAT diferent, la posa al dia:
 * altrament, afinar el càlcul de dificultat no serviria de res per a tot el que ja
 * està sembrat, i el mode adaptatiu seguiria veient les xifres velles.
 *
 * L'ESTAT es resincronitza pel mateix motiu, i a més és el que permet que la poda de
 * `retireDroppedFamilies()` sigui reversible: una pregunta retirada que el generador torna
 * a demanar es torna a publicar sola.
 */
let difficultyResynced = 0;
let statusResynced = 0;
async function upsertQuestion(data: Parameters<typeof prisma.question.create>[0]["data"]) {
  const exists = await prisma.question.findFirst({
    where: { prompt: data.prompt as string, typeSlug: data.typeSlug as string },
    select: { id: true, difficulty: true, status: true },
  });
  if (exists) {
    const patch: { difficulty?: number; status?: string } = {};
    if (typeof data.difficulty === "number" && exists.difficulty !== data.difficulty) {
      patch.difficulty = data.difficulty;
      difficultyResynced++;
    }
    if (typeof data.status === "string" && exists.status !== data.status) {
      patch.status = data.status;
      statusResynced++;
    }
    if (Object.keys(patch).length > 0) {
      await prisma.question.update({ where: { id: exists.id }, data: patch });
    }
    return false;
  }
  await prisma.question.create({ data });
  return true;
}

async function main() {
  for (const slug of QUESTION_TYPES) {
    await prisma.questionType.upsert({ where: { slug }, update: {}, create: { slug, name: TYPE_NAMES[slug] ?? slug } });
  }
  await prisma.game.upsert({ where: { slug: "quiz" }, update: {}, create: { slug: "quiz", name: "Quiz" } });
  await prisma.game.upsert({
    where: { slug: "match3" },
    update: {},
    create: { slug: "match3", name: "Match-3", isActive: false },
  });

  const catGeo = await prisma.category.upsert({
    where: { slug: "geografia" }, update: {}, create: { slug: "geografia", name: "Geografia", icon: "🌍" },
  });
  const catHist = await prisma.category.upsert({
    where: { slug: "historia" }, update: {}, create: { slug: "historia", name: "Història", icon: "🏛️" },
  });
  const catSci = await prisma.category.upsert({
    where: { slug: "ciencia" }, update: {}, create: { slug: "ciencia", name: "Ciència", icon: "🔬" },
  });
  const catNat = await prisma.category.upsert({
    where: { slug: "natura" }, update: {}, create: { slug: "natura", name: "Natura", icon: "🦁" },
  });
  const catCul = await prisma.category.upsert({
    where: { slug: "cultura" }, update: {}, create: { slug: "cultura", name: "Cultura", icon: "🎭" },
  });
  const catBySlug: Record<string, string> = { geografia: catGeo.id, historia: catHist.id, ciencia: catSci.id, cultura: catCul.id, natura: catNat.id };

  for (let level = 1; level <= 50; level++) {
    await prisma.levelThreshold.upsert({
      where: { level },
      update: {},
      create: { level, xpNeeded: BigInt(250 * level * (level - 1)) },
    });
  }

  for (const a of [
    { slug: "primera-partida", name: "Primera partida", description: "Acaba la teva primera partida", icon: "🎉" },
    { slug: "ratxa-3-dies", name: "Constància", description: "Juga 3 dies seguits", icon: "🔥" },
    { slug: "nivell-5", name: "Nivell 5", description: "Arriba al nivell 5", icon: "⭐" },
  ]) {
    await prisma.achievement.upsert({ where: { slug: a.slug }, update: {}, create: a });
  }

  // Dataset de països (ara amb codi ISO per a la bandera emoji).
  await prisma.dataset.upsert({ where: { slug: "countries" }, update: {}, create: { slug: "countries", name: "Països" } });
  await prisma.datasetItem.deleteMany({ where: { datasetSlug: "countries" } });
  for (const c of COUNTRIES) {
    await prisma.datasetItem.create({
      data: {
        datasetSlug: "countries",
        label: c.label,
        attributes: { cc: c.cc, capital: c.capital, lat: c.lat, lng: c.lng, continent: c.continent },
      },
    });
  }

  // DECISIÓ juliol 2026: fora preguntes d'escriure (fricció) → es retiren de la rotació.
  const retired = await prisma.question.updateMany({
    where: { typeSlug: "text_input", status: "published" },
    data: { status: "retired" },
  });

  // ── GENERACIÓ de preguntes des del dataset ────────────────────────────────
  let generated = 0;
  for (const c of COUNTRIES) {
    const sameContinent = COUNTRIES.filter((o) => o.label !== c.label && o.continent === c.continent);
    const others = COUNTRIES.filter((o) => o.label !== c.label && o.continent !== c.continent);
    const countryDistractors = shuffled([...sameContinent, ...shuffled(others)].slice(0, 8)).slice(0, 3);

    // 1) capital → país (MC)
    {
      const [options, correctId] = mcOptions(c.label, countryDistractors.map((d) => d.label));
      if (await upsertQuestion({
        typeSlug: "multiple_choice", categoryId: catGeo.id, locale: "ca",
        prompt: `De quin país és capital ${c.capital}?`,
        payload: { options }, answer: { correctId },
        difficulty: c.difficulty, status: "published", tags: ["generated", "capitals"],
      })) generated++;
    }
    // 2) país → capital (MC)
    {
      const [options, correctId] = mcOptions(c.capital, countryDistractors.map((d) => d.capital));
      if (await upsertQuestion({
        typeSlug: "multiple_choice", categoryId: catGeo.id, locale: "ca",
        prompt: `Quina és la capital de ${c.label}?`,
        payload: { options }, answer: { correctId },
        difficulty: c.difficulty, status: "published", tags: ["generated", "capitals"],
      })) generated++;
    }
    // 3) bandera (emoji) → país (MC) — substitueix les d'escriure
    {
      const [options, correctId] = mcOptions(c.label, countryDistractors.map((d) => d.label));
      if (await upsertQuestion({
        typeSlug: "multiple_choice", categoryId: catGeo.id, locale: "ca",
        prompt: `De quin país és aquesta bandera?  ${flagEmoji(c.cc)}`,
        payload: { options }, answer: { correctId },
        difficulty: Math.min(5, c.difficulty + 1), status: "published", tags: ["generated", "banderes"],
      })) generated++;
    }
    // 4) situa la capital al mapa
    if (await upsertQuestion({
      typeSlug: "map_guess", categoryId: catGeo.id, locale: "ca",
      prompt: `On és ${c.capital}? Clica al mapa`,
      payload: { center: [20, 0], zoom: 1 },
      answer: { lat: c.lat, lng: c.lng, toleranceKm: 800 },
      difficulty: Math.min(5, c.difficulty + 1), status: "published", tags: ["generated", "mapa"],
    })) generated++;
    // 4b) la mateixa, però fina: el marge estret la converteix en una pregunta d'experts.
    if (await upsertQuestion({
      typeSlug: "map_guess", categoryId: catGeo.id, locale: "ca",
      prompt: `Situa ${c.capital} amb precisió (marge de 250 km)`,
      payload: { center: [20, 0], zoom: 1 },
      answer: { lat: c.lat, lng: c.lng, toleranceKm: 250 },
      difficulty: clampDiff(c.difficulty + 2), status: "published", tags: ["generated", "mapa", "precisio"],
    })) generated++;
  }

  // 5) ORDENA-HO: capitals de nord a sud, generades des del dataset.
  const byLat = [...COUNTRIES].sort((a, b) => b.lat - a.lat);

  async function orderingGroup(group: typeof COUNTRIES) {
    if (group.length < 4) return;
    const gaps = group.slice(1).map((c, k) => group[k].lat - c.lat);
    const display = shuffled(group).map((c, idx) => ({ id: String.fromCharCode(97 + idx), text: c.capital, lat: c.lat }));
    const order = [...display].sort((a, b) => b.lat - a.lat).map((d) => d.id);
    // Prompt únic per grup (alfabètic: no revela l'ordre geogràfic) → idempotència correcta.
    const alpha = group.map((g) => g.capital).sort((a, b) => a.localeCompare(b)).join(", ");
    if (await upsertQuestion({
      typeSlug: "ordering", categoryId: catGeo.id, locale: "ca",
      prompt: `Ordena de nord a sud: ${alpha}`,
      payload: { items: display.map(({ id, text }) => ({ id, text })), criterion: "de nord a sud" },
      answer: { order },
      // Com més juntes són les latituds, més difícil: 4 capitals a 20° l'una de l'altra
      // les ordena qualsevol; 4 dins de 2° és per a qui se sap el mapa de memòria.
      difficulty: gapDifficulty(Math.min(...gaps), "graus"),
      status: "published", tags: ["generated", "ordena"],
    })) generated++;
  }

  // Grups amb separacions diferents: cadascun cau a una dificultat diferent tot sol.
  for (const minGap of [20, 12, 4, 2, 1]) {
    for (let i = 0; i + 4 <= byLat.length; i += 3) {
      const group: typeof COUNTRIES = [];
      for (const c of byLat.slice(i)) {
        if (group.length === 4) break;
        const prev = group[group.length - 1];
        if (!prev || (prev.lat - c.lat >= minGap && prev.lat - c.lat < minGap * 3)) group.push(c);
      }
      await orderingGroup(group);
    }
  }

  // 5a-bis) CONTINENT: la pregunta més fàcil que es pot generar del dataset. Fa de terra
  // de l'escala, que estava buit (només 22 preguntes de nivell 1 per a tots els novells).
  for (const c of COUNTRIES) {
    const others = [...new Set(COUNTRIES.map((o) => o.continent))].filter((x) => x !== c.continent);
    const [options, correctId] = mcOptions(c.continent, shuffled(others).slice(0, 3));
    if (await upsertQuestion({
      typeSlug: "multiple_choice", categoryId: catGeo.id, locale: "ca",
      prompt: `En quin continent és ${c.label}?`,
      payload: { options }, answer: { correctId },
      difficulty: clampDiff(c.difficulty - 1), status: "published", tags: ["generated", "continents"],
    })) generated++;
  }

  // 5b) CRONOLOGIA: ordena fets del més antic al més recent (línia de temps). Any negatiu = aC.
  const TIMELINE: Array<{ topic: string; events: Array<{ text: string; year: number }> }> = [
    { topic: "historia", events: [
      { text: "Descoberta d'Amèrica", year: 1492 }, { text: "Revolució Francesa", year: 1789 },
      { text: "Primera Guerra Mundial", year: 1914 }, { text: "Caiguda del mur de Berlín", year: 1989 } ] },
    { topic: "historia", events: [
      { text: "Fundació de Roma", year: -753 }, { text: "Caiguda de l'Imperi Romà d'Occident", year: 476 },
      { text: "Pesta Negra a Europa", year: 1347 }, { text: "Caiguda de Constantinoble", year: 1453 } ] },
    { topic: "historia", events: [
      { text: "Primera volta al món (Magallanes-Elcano)", year: 1522 }, { text: "Independència dels EUA", year: 1776 },
      { text: "Revolució Russa", year: 1917 }, { text: "Segona Guerra Mundial (inici)", year: 1939 } ] },
    { topic: "ciencia", events: [
      { text: "Llei de la gravitació de Newton", year: 1687 }, { text: "Teoria de l'evolució de Darwin", year: 1859 },
      { text: "Teoria de la relativitat d'Einstein", year: 1905 }, { text: "Estructura de l'ADN", year: 1953 } ] },
    { topic: "ciencia", events: [
      { text: "Impremta de Gutenberg", year: 1440 }, { text: "Màquina de vapor de Watt", year: 1769 },
      { text: "Primer vol dels germans Wright", year: 1903 }, { text: "Primer home a la Lluna", year: 1969 } ] },
    { topic: "catalunya", events: [
      { text: "Fi de la Guerra de Successió (1714)", year: 1714 }, { text: "Setmana Tràgica", year: 1909 },
      { text: "Guerra Civil espanyola (inici)", year: 1936 }, { text: "Jocs Olímpics de Barcelona", year: 1992 } ] },
    { topic: "espanya", events: [
      { text: "Descoberta d'Amèrica", year: 1492 }, { text: "Guerra de la Independència espanyola", year: 1808 },
      { text: "Guerra Civil espanyola", year: 1936 }, { text: "Constitució espanyola", year: 1978 } ] },
    { topic: "historia", events: [
      { text: "Construcció de les piràmides de Gizeh", year: -2560 }, { text: "Fundació de Roma", year: -753 },
      { text: "Naixement de Jesús de Natzaret", year: 0 }, { text: "Hègira de Mahoma", year: 622 } ] },
  ];
  let timelineN = 0;
  for (const set of TIMELINE) {
    const display = shuffled(set.events).map((e, i) => ({ id: String.fromCharCode(97 + i), text: e.text, year: e.year }));
    const order = [...display].sort((a, b) => a.year - b.year).map((d) => d.id);
    // Fets separats per segles els ordena qualsevol; dins de la mateixa dècada, no.
    const chrono = [...set.events].sort((a, b) => a.year - b.year);
    const minYearGap = Math.min(...chrono.slice(1).map((e, k) => e.year - chrono[k].year));
    const years: Record<string, number> = {};
    display.forEach((d) => (years[d.id] = d.year));
    const tag = `timeline:${set.events.map((e) => e.text).sort().join("|").slice(0, 60)}`;
    const exists = await prisma.question.findFirst({ where: { typeSlug: "timeline", tags: { has: tag } }, select: { id: true, difficulty: true } });
    const difficulty = gapDifficulty(minYearGap, "anys");
    if (exists && exists.difficulty !== difficulty) {
      await prisma.question.update({ where: { id: exists.id }, data: { difficulty } });
      difficultyResynced++;
    }
    if (!exists) {
      await prisma.question.create({
        data: {
          typeSlug: "timeline", categoryId: catBySlug[set.topic] ?? catHist.id, locale: "ca",
          prompt: "Ordena aquests fets del més antic al més recent",
          payload: { events: display.map(({ id, text }) => ({ id, text })), criterion: "del més antic al més recent" },
          answer: { order, years },
          difficulty,
          status: "published", topicSlug: set.topic, tags: ["generated", "cronologia", tag],
        },
      });
      timelineN++;
    }
  }
  generated += timelineN;

  // 5c) SILUETA: el contorn es descobreix a poc a poc i has de dir què és.
  //     Totes comparteixen el mateix enunciat, així que la idempotència va per etiqueta (com la cronologia).
  async function seedSilhouette(o: {
    key: string; label: string; prompt: string; distractors: string[];
    difficulty: number; topicSlug?: string; tag: string;
  }): Promise<boolean> {
    const shape = SILHOUETTES[o.key];
    if (!shape) return false;
    const exists = await prisma.question.findFirst({
      where: { typeSlug: "silhouette", tags: { has: o.tag } }, select: { id: true },
    });
    if (exists) return false;
    const [options, correctId] = mcOptions(o.label, o.distractors);
    await prisma.question.create({
      data: {
        typeSlug: "silhouette", categoryId: catGeo.id, locale: "ca",
        prompt: o.prompt,
        payload: { path: shape.path, w: shape.w, h: shape.h, options, reveal: "wipe" },
        answer: { correctId },
        difficulty: o.difficulty, status: "published", topicSlug: o.topicSlug,
        tags: ["generated", "silueta", o.tag],
      },
    });
    return true;
  }

  let silhouetteN = 0;
  for (const c of COUNTRIES) {
    const sameContinent = COUNTRIES.filter((o) => o.label !== c.label && o.continent === c.continent);
    const others = COUNTRIES.filter((o) => o.label !== c.label && o.continent !== c.continent);
    // Distractors del mateix continent: si no, la forma es distingeix massa fàcil.
    const distractors = shuffled([...sameContinent, ...shuffled(others)].slice(0, 8)).slice(0, 3);
    if (await seedSilhouette({
      key: c.cc, label: c.label, prompt: "Quin país és aquesta silueta?",
      distractors: distractors.map((d) => d.label),
      difficulty: Math.min(5, c.difficulty + 1), tag: `silueta:${c.cc}`,
    })) silhouetteN++;
  }
  for (const r of CCAA) {
    const distractors = shuffled(CCAA.filter((o) => o.key !== r.key)).slice(0, 3);
    if (await seedSilhouette({
      key: r.key, label: r.label, prompt: "Quina comunitat autònoma és aquesta silueta?",
      distractors: distractors.map((d) => d.label), difficulty: r.difficulty,
      topicSlug: r.key === "es-catalunya" ? "catalunya" : "espanya", tag: `silueta:${r.key}`,
    })) silhouetteN++;
  }
  generated += silhouetteN;

  // 6) MÉS ALT O MÉS BAIX: b té més/menys [mètrica] que a? Generat del dataset.
  const withStats = COUNTRIES.filter((c) => STATS[c.label]);
  const metrics: Array<{ key: "pop" | "area"; label: string; fmt: (v: number) => string }> = [
    { key: "pop", label: "població", fmt: (v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} B` : `${v} M`) + " hab." },
    { key: "area", label: "superfície", fmt: (v) => `${(v * 1000).toLocaleString("ca")} km²` },
  ];
  const hlPrompts = new Set<string>();
  for (const metric of metrics) {
    const sorted = [...withStats].sort((a, b) => STATS[a.label][metric.key] - STATS[b.label][metric.key]);
    const val = (c: (typeof sorted)[number]) => STATS[c.label][metric.key];

    async function pair(a: (typeof sorted)[number], b: (typeof sorted)[number], i: number, j: number) {
      // Ordre determinista (idempotent en reseed) però variat: alterna qui va davant.
      const [known, hidden] = (i + j) % 2 === 0 ? [a, b] : [b, a];
      const vKnown = val(known), vHidden = val(hidden);
      // Dificultat de la proporció, ajustada per si els països són coneguts o no.
      const known2 = (fame(known.label) + fame(hidden.label)) / 2;
      const difficulty = clampDiff(ratioDifficulty(vKnown, vHidden) + (known2 - 2) * 0.4);
      const prompt = `${hidden.label} té més o menys ${metric.label} que ${known.label}?`;
      hlPrompts.add(prompt);
      if (await upsertQuestion({
        typeSlug: "higher_lower", categoryId: catGeo.id, locale: "ca",
        prompt,
        payload: { metric: metric.label, a: { label: known.label, display: metric.fmt(vKnown) }, b: { label: hidden.label } },
        answer: { bHigher: vHidden > vKnown, bDisplay: metric.fmt(vHidden) },
        difficulty, status: "published", tags: ["generated", "mesomenys", metric.key],
      })) generated++;
    }

    // UNA parella per país, rotant la proporció buscada: així la mecànica cobreix tota
    // l'escala en comptes de fer dos pics (o òbvies o gairebé impossibles, res al mig)
    // i no s'infla fins a menjar-se una quarta part del pou.
    const bands = [1.02, 1.25, 1.9, 8];
    for (let i = 0; i < sorted.length; i++) {
      const minRatio = bands[i % bands.length];
      const j = sorted.findIndex((c, k) => k > i && val(c) / val(sorted[i]) >= minRatio);
      if (j > i) await pair(sorted[i], sorted[j], i, j);
    }
  }

  // Si el generador canvia (com va passar en repartir la dificultat), les preguntes que
  // ja no produeix es queden al pou per sempre. Es retiren: no s'esborren, perquè n'hi pot
  // haver de jugades i trencaria l'històric de partides.
  const staleHl = await prisma.question.updateMany({
    // Filtrat per "mesomenys", no per "generated": amb l'etiqueta genèrica també retirava
    // les comparacions de Wikidata (elements, personatges), que són d'un altre generador.
    where: { typeSlug: "higher_lower", status: "published", tags: { has: "mesomenys" }, prompt: { notIn: [...hlPrompts] } },
    data: { status: "retired" },
  });
  if (staleHl.count) console.log(`Més-o-menys: ${staleHl.count} preguntes velles retirades (el generador ja no les fa).`);

  // 6b) ESTIMACIÓ ("el preu just"): quants habitants / superfície / densitat.
  // El marge d'encert va lligat a com de conegut és el país: dels que tothom coneix se'n
  // demana menys precisió (fàcil) i dels llunyans, més (difícil). Així la mateixa
  // mecànica cobreix de l'1 al 5 en comptes de quedar-se tota al 3.
  for (const c of withStats.filter((c) => STATS[c.label].pop >= 15)) {
    const f = fame(c.label);
    if (await upsertQuestion({
      typeSlug: "estimation", categoryId: catGeo.id, locale: "ca",
      prompt: `Quants habitants té ${c.label}?`,
      payload: { unit: "milions d'hab.", min: 0, max: 1500, step: 1, scale: "log" },
      answer: { value: STATS[c.label].pop, tolerancePct: f <= 1 ? 45 : f === 2 ? 35 : 25 },
      difficulty: clampDiff(f), status: "published", tags: ["generated", "estimacio", "poblacio"],
    })) generated++;
  }
  for (const c of withStats) {
    const f = fame(c.label);
    if (await upsertQuestion({
      typeSlug: "estimation", categoryId: catGeo.id, locale: "ca",
      prompt: `Quina superfície té ${c.label}?`,
      payload: { unit: "mil km²", min: 0, max: 10000, step: 10, scale: "log" },
      answer: { value: STATS[c.label].area, tolerancePct: f <= 1 ? 45 : f === 2 ? 35 : 25 },
      difficulty: clampDiff(f + 1), status: "published", tags: ["generated", "estimacio", "superficie"],
    })) generated++;
  }
  // Densitat: surt de les dues xifres que ja tenim i és molt menys intuïtiva que la
  // població → alimenta la part alta de l'escala, que és on teníem el forat.
  for (const c of withStats) {
    const density = Math.round((STATS[c.label].pop * 1_000_000) / (STATS[c.label].area * 1000));
    if (density < 1) continue;
    if (await upsertQuestion({
      typeSlug: "estimation", categoryId: catGeo.id, locale: "ca",
      prompt: `Quants habitants per km² té ${c.label}?`,
      payload: { unit: "hab./km²", min: 0, max: 600, step: 1, scale: "log" },
      answer: { value: density, tolerancePct: 40 },
      difficulty: clampDiff(fame(c.label) + 1.5), status: "published", tags: ["generated", "estimacio", "densitat"],
    })) generated++;
  }

  // 7) FOTO MISTERIOSA (image_guess amb revelat progressiu). Les imatges del manifest ja
  // vénen amb la llicència comprovada contra Commons (download-mystery.mjs en descarta les
  // que no són lliures), i el crèdit viatja fins a la pantalla: la majoria són CC BY-SA i
  // acreditar l'autor no és opcional.
  let mystery = 0;
  // Preguntes d'una execució anterior que apunten a imatges que ja no passen el filtre:
  // s'han de retirar, no esborrar (n'hi pot haver de jugades i trencaria l'històric).
  const keepTags = MYSTERY.map((m) => `mystery:${m.file}`);
  const dropped = await prisma.question.updateMany({
    where: { typeSlug: "image_guess", tags: { has: "mystery" }, status: "published", NOT: { tags: { hasSome: keepTags } } },
    data: { status: "retired" },
  });
  if (dropped.count) console.log(`Fotos misterioses retirades (llicència no lliure): ${dropped.count}`);
  for (const item of MYSTERY) {
    // Registra l'actiu amb la font per a l'atribució (disciplina de drets).
    const mediaId = stableMediaId(item.file);
    const credit = [item.author, item.license].filter(Boolean).join(" · ");
    const asset = await prisma.mediaAsset.upsert({
      where: { id: mediaId },
      // També a `update`: els actius sembrats abans de verificar les llicències portaven
      // "wikimedia-lead (verificar)" i s'hi haurien quedat.
      update: { license: item.license, attribution: credit, sourceUrl: item.source },
      create: {
        id: mediaId,
        kind: "image", storagePath: item.file,
        license: item.license, attribution: credit, sourceUrl: item.source,
      },
    });
    const sameGroup = MYSTERY.filter((m) => m.group === item.group && m.label !== item.label);
    const [options, correctId] = mcOptions(item.label, shuffled(sameGroup).slice(0, 3).map((m) => m.label));
    const cat = item.group === "animals" ? catNat.id : catCul.id;
    // Dedup per tag únic (el prompt és igual per a totes per no revelar la resposta).
    const tag = `mystery:${item.file}`;
    const exists = await prisma.question.findFirst({ where: { typeSlug: "image_guess", tags: { has: tag } }, select: { id: true, payload: true } });
    if (exists) {
      // Les preguntes ja sembrades no portaven crèdit al payload: cal posar-l'hi.
      await prisma.question.update({
        where: { id: exists.id },
        data: { status: "published", payload: { ...(exists.payload as object), credit, creditUrl: item.source } },
      });
    } else {
      await prisma.question.create({
        data: {
          typeSlug: "image_guess", categoryId: cat, locale: "ca",
          prompt: "Quina és la foto misteriosa?",
          payload: { imageUrl: item.file, options, reveal: "blur", mediaId: asset.id, credit, creditUrl: item.source },
          answer: { correctId },
          difficulty: 2, status: "published", tags: ["mystery", item.group, tag],
        },
      });
      mystery++;
    }
  }

  // 8) ACCENT: de quina varietat del català és aquesta veu? (audio_clip)
  // Àudio CC0 (Common Voice) + etiqueta de varietat (Projecte AINA, CC BY 4.0). El clip
  // se serveix des del storage amb URL signada; el fitxer local és la xarxa de seguretat.
  const ACCENT_LABELS = [...new Set(ACCENT_CLIPS.map((c) => c.label))];
  // Cap de preguntes per varietat i gènere: el manifest en porta moltes més, però una ronda
  // d'àudio és lenta i totes tenen el mateix enunciat. Amb 6+6 per varietat ja hi ha prou
  // veus diferents sense que la mecànica es mengi el pool (el jugador no repeteix clip).
  const PER_ACCENT_GENDER = 4;
  const usedPerCell: Record<string, number> = {};
  const accentPick = [...ACCENT_CLIPS]
    .sort((a, b) => a.file.localeCompare(b.file)) // determinista: el mateix subconjunt a cada seed
    .filter((c) => {
      const k = `${c.accent}|${c.gender}`;
      if ((usedPerCell[k] ?? 0) >= PER_ACCENT_GENDER) return false;
      usedPerCell[k] = (usedPerCell[k] ?? 0) + 1;
      return true;
    });
  let accentN = 0;
  for (const clip of accentPick) {
    const mediaId = stableMediaId(clip.file);
    const asset = await prisma.mediaAsset.upsert({
      where: { id: mediaId },
      update: {},
      create: {
        id: mediaId,
        kind: "audio", storagePath: clip.file, durationMs: clip.durationMs,
        license: clip.license, attribution: clip.attribution, sourceUrl: clip.source,
      },
    });
    const tag = `accent:${clip.file.split("/").pop()}`;
    const exists = await prisma.question.findFirst({
      where: { typeSlug: "audio_clip", tags: { has: tag } }, select: { id: true },
    });
    if (exists) continue;
    const [options, correctId] = mcOptions(clip.label, shuffled(ACCENT_LABELS.filter((l) => l !== clip.label)).slice(0, 3));
    await prisma.question.create({
      data: {
        typeSlug: "audio_clip", categoryId: catCul.id, locale: "ca",
        prompt: "De quina varietat del català és aquesta veu?",
        payload: { mediaId: asset.id, audioUrl: clip.file, playMs: clip.durationMs, options },
        answer: { correctId },
        difficulty: ACCENT_DIFFICULTY[clip.accent] ?? 3, status: "published",
        topicSlug: "catalunya", // falca local: la varietat dialectal és el ganxo de pertinença
        tags: ["generated", "accent", clip.accent, tag],
      },
    });
    accentN++;
  }
  generated += accentN;

  // 9) LLENGUA: quina llengua sona? (audio_clip). Mateix pipeline que els accents.
  // Cap de 2 clips per llengua, pel mateix motiu que als accents.
  const usedPerLocale: Record<string, number> = {};
  const languagePick = [...LANGUAGE_CLIPS]
    .sort((a, b) => a.file.localeCompare(b.file))
    .filter((c) => {
      if ((usedPerLocale[c.locale] ?? 0) >= 2) return false;
      usedPerLocale[c.locale] = (usedPerLocale[c.locale] ?? 0) + 1;
      return true;
    });
  let languageN = 0;
  for (const clip of languagePick) {
    const mediaId = stableMediaId(clip.file);
    const asset = await prisma.mediaAsset.upsert({
      where: { id: mediaId },
      update: {},
      create: {
        id: mediaId,
        kind: "audio", storagePath: clip.file,
        license: clip.license, attribution: clip.attribution, sourceUrl: clip.source,
      },
    });
    const tag = `llengua:${clip.file.split("/").pop()}`;
    const exists = await prisma.question.findFirst({
      where: { typeSlug: "audio_clip", tags: { has: tag } }, select: { id: true },
    });
    if (exists) continue;
    // Distractors de la mateixa família lingüística: si no, n'hi ha prou de sentir dos
    // sons per encertar i la pregunta deixa de tenir gràcia.
    const family = [...new Set(LANGUAGE_CLIPS.filter((l) => l.group === clip.group && l.label !== clip.label).map((l) => l.label))];
    const rest = [...new Set(LANGUAGE_CLIPS.filter((l) => l.group !== clip.group).map((l) => l.label))];
    const distractors = [...shuffled(family).slice(0, 2), ...shuffled(rest)].slice(0, 3);
    const [options, correctId] = mcOptions(clip.label, distractors);
    await prisma.question.create({
      data: {
        typeSlug: "audio_clip", categoryId: catCul.id, locale: "ca",
        prompt: "Quina llengua sona?",
        payload: { mediaId: asset.id, audioUrl: clip.file, options },
        answer: { correctId },
        difficulty: clip.difficulty, status: "published",
        tags: ["generated", "llengua", clip.locale, tag],
      },
    });
    languageN++;
  }
  generated += languageN;

  // 10) INSTRUMENT: quin instrument sona? (audio_clip)
  // Cap de 2 per instrument: amb 25 instruments ja són 50 preguntes, i entre accents,
  // llengües i instruments l'àudio no ha de passar de ~1,5 rondes per partida.
  const PER_INSTRUMENT_Q = 2;
  const usedPerInstrument: Record<string, number> = {};
  const instrumentPick = [...INSTRUMENT_CLIPS]
    .sort((a, b) => a.file.localeCompare(b.file))
    .filter((c) => {
      if ((usedPerInstrument[c.slug] ?? 0) >= PER_INSTRUMENT_Q) return false;
      usedPerInstrument[c.slug] = (usedPerInstrument[c.slug] ?? 0) + 1;
      return true;
    });
  let instrumentN = 0;
  for (const clip of instrumentPick) {
    const mediaId = stableMediaId(clip.file);
    const asset = await prisma.mediaAsset.upsert({
      where: { id: mediaId },
      update: {},
      create: {
        id: mediaId,
        kind: "audio", storagePath: clip.file,
        license: clip.license, attribution: clip.attribution, sourceUrl: clip.source,
      },
    });
    const tag = `instrument:${clip.file.split("/").pop()}`;
    const exists = await prisma.question.findFirst({
      where: { typeSlug: "audio_clip", tags: { has: tag } }, select: { id: true },
    });
    if (exists) continue;
    // Distractors de la mateixa família instrumental: "violí / viola / violoncel" fa pensar;
    // "violí / timbals / didgeridoo" es respon sol.
    const family = [...new Set(INSTRUMENT_CLIPS.filter((i) => i.family === clip.family && i.label !== clip.label).map((i) => i.label))];
    const rest = [...new Set(INSTRUMENT_CLIPS.filter((i) => i.family !== clip.family).map((i) => i.label))];
    const distractors = [...shuffled(family).slice(0, 2), ...shuffled(rest)].slice(0, 3);
    const [options, correctId] = mcOptions(clip.label, distractors);
    await prisma.question.create({
      data: {
        typeSlug: "audio_clip", categoryId: catCul.id, locale: "ca",
        prompt: "Quin instrument sona?",
        payload: { mediaId: asset.id, audioUrl: clip.file, options },
        answer: { correctId },
        difficulty: 3, status: "published",
        tags: ["generated", "instrument", clip.slug, tag],
      },
    });
    instrumentN++;
  }
  generated += instrumentN;

  // Preguntes a mà (MC, cert/fals, intrús).
  let handmade = 0;
  for (const h of HANDMADE) {
    const correctText = h.options[h.correct];
    const [options, correctId] = mcOptions(correctText, h.options.filter((_, i) => i !== h.correct));
    if (await upsertQuestion({
      typeSlug: "multiple_choice", categoryId: catBySlug[h.category], locale: "ca",
      prompt: h.prompt,
      payload: { options }, answer: { correctId },
      difficulty: h.difficulty ?? 2, status: "published", tags: ["handmade"],
    })) handmade++;
  }

  // Abans de generar, no després: així el generador encara pot tornar a publicar les que
  // segueixi volent (`upsertQuestion` resincronitza l'estat) i la poda només deixa retirat
  // el que de debò s'ha tret.
  await retireDroppedFamilies();

  // ── WIKIDATA (CC0): Ciència, Història, Cultura i Natura ─────────────────────
  // El joc era 75% geografia perquè l'únic dataset que teníem era de països. Aquest
  // bloc alimenta la resta de categories des de Wikidata, amb la mateixa disciplina:
  // dades verificables, llicència neta i dificultat deduïda de la fama de cada ítem.
  const wikidataN = await seedWikidata({
    prisma,
    cats: { ciencia: catSci.id, historia: catHist.id, cultura: catCul.id, natura: catNat.id, geografia: catGeo.id },
    upsertQuestion, mcOptions, shuffled, clampDiff, gapDifficulty,
  });
  generated += wikidataN;

  // ── CONTINGUT PREMIUM (monetització): packs desbloquejables amb crèdits ──────
  const PACKS: Array<{ slug: string; name: string; icon: string; price: number; desc: string; questions: Array<{ prompt: string; options: string[]; correct: number; cat: string }> }> = [
    {
      slug: "cinema", name: "Cinema", icon: "🎬", price: 30, desc: "Preguntes de cinema i sèries.",
      questions: [
        { prompt: "Qui va dirigir 'Pulp Fiction'?", options: ["Quentin Tarantino", "Martin Scorsese", "Steven Spielberg", "Coen"], correct: 0, cat: "cultura" },
        { prompt: "En quina ciutat passa 'Casablanca'?", options: ["Casablanca", "Alger", "El Caire", "Tànger"], correct: 0, cat: "cultura" },
        { prompt: "Quin actor interpreta Jack a 'Titanic'?", options: ["Leonardo DiCaprio", "Brad Pitt", "Tom Cruise", "Matt Damon"], correct: 0, cat: "cultura" },
        { prompt: "Quina pel·lícula guanyà l'Oscar a millor film el 2020?", options: ["Paràsits", "1917", "Joker", "Once Upon a Time"], correct: 0, cat: "cultura" },
        { prompt: "Qui va crear la saga 'El Senyor dels Anells' (llibres)?", options: ["J.R.R. Tolkien", "C.S. Lewis", "G.R.R. Martin", "Rowling"], correct: 0, cat: "cultura" },
      ],
    },
    {
      slug: "esports", name: "Esports", icon: "⚽", price: 30, desc: "Preguntes d'esports.",
      questions: [
        { prompt: "Cada quants anys se celebren els Jocs Olímpics d'estiu?", options: ["4", "2", "3", "5"], correct: 0, cat: "cultura" },
        { prompt: "Quants jugadors té un equip de futbol al camp?", options: ["11", "10", "9", "12"], correct: 0, cat: "cultura" },
        { prompt: "En quin esport es fa un 'slam dunk'?", options: ["Bàsquet", "Voleibol", "Tennis", "Handbol"], correct: 0, cat: "cultura" },
        { prompt: "Quin país ha guanyat més Mundials de futbol?", options: ["Brasil", "Alemanya", "Itàlia", "Argentina"], correct: 0, cat: "cultura" },
        { prompt: "Quantes anelles té el símbol olímpic?", options: ["5", "4", "6", "3"], correct: 0, cat: "cultura" },
      ],
    },
  ];
  let premiumQ = 0;
  for (const pk of PACKS) {
    await prisma.premiumPack.upsert({
      where: { slug: pk.slug }, update: { priceCredits: pk.price },
      create: { slug: pk.slug, name: pk.name, icon: pk.icon, priceCredits: pk.price, description: pk.desc },
    });
    for (const q of pk.questions) {
      const correctText = q.options[q.correct];
      const [options, correctId] = mcOptions(correctText, q.options.filter((_, i) => i !== q.correct));
      if (await upsertQuestion({
        typeSlug: "multiple_choice", categoryId: catBySlug[q.cat] ?? catCul.id, locale: "ca",
        prompt: q.prompt, payload: { options }, answer: { correctId },
        difficulty: 3, status: "published", premiumPack: pk.slug, tags: ["premium", pk.slug],
      })) premiumQ++;
    }
  }

  // ── TEMÀTIQUES: catàleg + etiquetatge + contingut local ──────────────────
  const TOPICS = [
    { slug: "mon", name: "Món", icon: "🌍", kind: "general", regions: [] as string[], sortOrder: 1 },
    { slug: "historia", name: "Història", icon: "🏛️", kind: "general", regions: [] as string[], sortOrder: 2 },
    { slug: "ciencia", name: "Ciència", icon: "🔬", kind: "general", regions: [] as string[], sortOrder: 3 },
    { slug: "cultura", name: "Cultura", icon: "🎬", kind: "general", regions: [] as string[], sortOrder: 4 },
    // Temes concrets: fins ara només hi havia els blocs grossos (Món/Història/Ciència/
    // Cultura). Amb 2.800+ preguntes ja hi ha material per centrar-se en una cosa sola.
    { slug: "cinema", name: "Cinema", icon: "🎞️", kind: "general", regions: [] as string[], sortOrder: 5 },
    { slug: "literatura", name: "Literatura", icon: "📚", kind: "general", regions: [] as string[], sortOrder: 6 },
    { slug: "art", name: "Art", icon: "🖼️", kind: "general", regions: [] as string[], sortOrder: 7 },
    { slug: "natura", name: "Natura", icon: "🦁", kind: "general", regions: [] as string[], sortOrder: 8 },
    { slug: "llengues", name: "Llengües", icon: "🗣️", kind: "general", regions: [] as string[], sortOrder: 9 },
    { slug: "musica", name: "Música", icon: "🎵", kind: "general", regions: [] as string[], sortOrder: 10 },
    { slug: "catalunya", name: "Catalunya", icon: "🏰", kind: "region", regions: ["catalunya"], sortOrder: 20 },
    { slug: "espanya", name: "Espanya", icon: "🇪🇸", kind: "region", regions: ["catalunya", "espanya"], sortOrder: 21 },
  ];
  for (const t of TOPICS) {
    await prisma.topic.upsert({ where: { slug: t.slug }, update: { name: t.name, icon: t.icon, kind: t.kind, regions: t.regions, sortOrder: t.sortOrder }, create: t });
  }

  // Preguntes locals (Catalunya i Espanya/CCAA) — falca hiperlocal.
  const LOCAL: Array<{ prompt: string; options: string[]; correct: number; cat: string; topic: string; diff?: number }> = [
    { prompt: "Quina és la muntanya més alta de Catalunya?", options: ["Pica d'Estats", "Puigmal", "Montseny", "Canigó"], correct: 0, cat: "geografia", topic: "catalunya", diff: 3 },
    { prompt: "Quantes províncies té Catalunya?", options: ["4", "3", "5", "6"], correct: 0, cat: "geografia", topic: "catalunya" },
    { prompt: "Quin riu passa per Lleida?", options: ["Segre", "Ter", "Llobregat", "Fluvià"], correct: 0, cat: "geografia", topic: "catalunya", diff: 3 },
    { prompt: "Quin riu travessa Girona amb les cases de colors?", options: ["Onyar", "Ter", "Fluvià", "Muga"], correct: 0, cat: "geografia", topic: "catalunya", diff: 4 },
    { prompt: "Quin dia se celebra la Diada de Catalunya?", options: ["11 de setembre", "23 d'abril", "24 de juny", "1 de maig"], correct: 0, cat: "cultura", topic: "catalunya" },
    { prompt: "Quin dia és Sant Jordi?", options: ["23 d'abril", "11 de setembre", "6 de gener", "24 de juny"], correct: 0, cat: "cultura", topic: "catalunya" },
    { prompt: "Quina és la dansa tradicional catalana?", options: ["La sardana", "La jota", "El fandango", "La muixeranga"], correct: 0, cat: "cultura", topic: "catalunya" },
    { prompt: "En quin any es van fer els Jocs Olímpics de Barcelona?", options: ["1992", "1988", "1996", "2000"], correct: 0, cat: "historia", topic: "catalunya" },
    { prompt: "Quin arquitecte va dissenyar la Sagrada Família?", options: ["Antoni Gaudí", "Lluís Domènech", "Josep Puig", "Enric Sagnier"], correct: 0, cat: "cultura", topic: "catalunya" },
    { prompt: "Quin pintor surrealista era de Figueres?", options: ["Salvador Dalí", "Joan Miró", "Antoni Tàpies", "Pablo Picasso"], correct: 0, cat: "cultura", topic: "catalunya" },
    { prompt: "De quina comarca és capital Vic?", options: ["Osona", "El Bages", "La Selva", "El Ripollès"], correct: 0, cat: "geografia", topic: "catalunya", diff: 4 },
    { prompt: "Quina és la segona ciutat més poblada de Catalunya?", options: ["L'Hospitalet de Llobregat", "Badalona", "Terrassa", "Girona"], correct: 0, cat: "geografia", topic: "catalunya", diff: 4 },
    { prompt: "Quin és el llac natural més gran de Catalunya?", options: ["Estany de Banyoles", "Estany de Sant Maurici", "Pantà de Sau", "Estany d'Ivars"], correct: 0, cat: "geografia", topic: "catalunya", diff: 3 },
    { prompt: "Quina és la capital d'Aragó?", options: ["Saragossa", "Osca", "Terol", "Calataiud"], correct: 0, cat: "geografia", topic: "espanya" },
    { prompt: "Quina és la capital de Galícia?", options: ["Santiago de Compostel·la", "A Corunya", "Vigo", "Lugo"], correct: 0, cat: "geografia", topic: "espanya", diff: 3 },
    { prompt: "Quina és la capital d'Andalusia?", options: ["Sevilla", "Màlaga", "Granada", "Còrdova"], correct: 0, cat: "geografia", topic: "espanya" },
    { prompt: "Quina és la capital del País Basc?", options: ["Vitòria-Gasteiz", "Bilbao", "Sant Sebastià", "Pamplona"], correct: 0, cat: "geografia", topic: "espanya", diff: 3 },
    { prompt: "Quantes comunitats autònomes té Espanya?", options: ["17", "15", "19", "20"], correct: 0, cat: "geografia", topic: "espanya", diff: 3 },
    { prompt: "Quina és la capital d'Astúries?", options: ["Oviedo", "Gijón", "Avilés", "Mieres"], correct: 0, cat: "geografia", topic: "espanya", diff: 3 },
    { prompt: "Quina és la capital d'Extremadura?", options: ["Mèrida", "Badajoz", "Càceres", "Plasència"], correct: 0, cat: "geografia", topic: "espanya", diff: 4 },
    { prompt: "Quin és el riu més llarg d'Espanya?", options: ["Tajo", "Ebre", "Duero", "Guadalquivir"], correct: 0, cat: "geografia", topic: "espanya", diff: 3 },
  ];
  let local = 0;
  for (const q of LOCAL) {
    const correctText = q.options[q.correct];
    const [options, correctId] = mcOptions(correctText, q.options.filter((_, i) => i !== q.correct));
    if (await upsertQuestion({
      typeSlug: "multiple_choice", categoryId: catBySlug[q.cat] ?? catGeo.id, locale: "ca",
      prompt: q.prompt, payload: { options }, answer: { correctId },
      difficulty: q.diff ?? 2, status: "published", topicSlug: q.topic, tags: ["local", q.topic],
    })) local++;
  }

  // Etiqueta el contingut existent (sense tema) segons la categoria.
  // Temes concrets per etiqueta. Va abans del repartiment per categoria, que és el
  // calaix de sastre: si no, tot el cinema acabaria dins de "Cultura" i el tema nou
  // no tindria contingut.
  const byTag: Array<[string, string[]]> = [
    // Els accents del català són la falca local: van a "catalunya", no a "llengües".
    ["catalunya", ["accent"]],
    ["cinema", ["cinema", "cinema-timeline"]],
    ["literatura", ["llibres", "llibres-timeline"]],
    ["art", ["pintura"]],
    ["natura", ["taxonomia"]],
    ["llengues", ["llengua"]], // els accents es queden a "catalunya": són la falca local
    ["musica", ["instrument"]],
  ];
  for (const [topic, tagList] of byTag) {
    await prisma.question.updateMany({ where: { tags: { hasSome: tagList } }, data: { topicSlug: topic } });
  }

  await prisma.question.updateMany({ where: { categoryId: catGeo.id, topicSlug: null }, data: { topicSlug: "mon" } });
  await prisma.question.updateMany({ where: { categoryId: catHist.id, topicSlug: null }, data: { topicSlug: "historia" } });
  await prisma.question.updateMany({ where: { categoryId: catSci.id, topicSlug: null }, data: { topicSlug: "ciencia" } });
  await prisma.question.updateMany({ where: { categoryId: { in: [catCul.id, catNat.id] }, topicSlug: null }, data: { topicSlug: "cultura" } });

  // Usuari admin per moderar la comunitat. El seed s'executa també contra la base de
  // dades de producció (desplegament), i allà una contrasenya publicada al repositori
  // seria un compte d'administrador obert a tothom: cal donar-la per entorn.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@quizcat.local";
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? null : "admin1234");
  if (!adminPassword) {
    console.log("Admin: omès (defineix SEED_ADMIN_PASSWORD per crear-lo en producció).");
  } else {
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 10), role: "admin",
          profile: { create: { displayName: "Admin" } },
        },
      });
    } else {
      await prisma.user.update({ where: { email: adminEmail }, data: { role: "admin" } });
    }
    console.log(`Admin: ${adminEmail}${process.env.SEED_ADMIN_PASSWORD ? "" : " / admin1234 (dev)"}`);
  }

  const total = await prisma.question.count({ where: { status: "published" } });
  const freeTotal = await prisma.question.count({ where: { status: "published", premiumPack: null } });
  const byTopic = await prisma.question.groupBy({ by: ["topicSlug"], where: { status: "published" }, _count: true });
  console.log(`Temes: ${TOPICS.length} · ${local} preguntes locals noves. Per tema: ${byTopic.map((t) => `${t.topicSlug ?? "—"}=${t._count}`).join(" · ")}`);
  const byType = await prisma.question.groupBy({ by: ["typeSlug"], where: { status: "published" }, _count: true });
  console.log(`Premium: ${PACKS.length} packs · ${premiumQ} preguntes premium noves. Gratuïtes: ${freeTotal}.`);
  console.log(`Seed fet: ${retired.count} text_input retirades · ${generated} generades · ${mystery} foto misteriosa (${MYSTERY.length} imatges) · ${handmade} a mà · ${total} publicades.`);
  console.log(byType.map((t) => `${t.typeSlug}=${t._count}`).join(" · "));
  // Es comptaven però no es deien enlloc, i són justament les dues xifres que diuen si una
  // poda o un recàlcul de dificultat ha arribat a la base o s'ha quedat al generador.
  console.log(`Resincronitzat: ${difficultyResynced} dificultats · ${statusResynced} estats.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
