// Baixa datasets de Wikidata (CC0) per generar preguntes que NO siguin de geografia.
//
//   node prisma/fetch-wikidata.mjs
//
// Per què Wikidata: és **CC0** (domini públic), les dades són verificables i, sobretot,
// porta un indicador de fama gratis — el nombre de wikis on existeix l'article — que fa
// de DIFICULTAT calculada en comptes de posada a mà.
//
// Regla dura: només s'agafen ítems amb **etiqueta en català**. Si no en tenen, fora:
// val més menys contingut que preguntes amb un nom en anglès enmig.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "wikidata-manifest.json");
const CACHE = path.join(__dirname, ".wikidata-cache");
const UA = "quizcat-content/1.0 (joc de trivia; joanetap@gmail.com)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sparql(name, query) {
  fs.mkdirSync(CACHE, { recursive: true });
  const cached = path.join(CACHE, `${name}.json`);
  if (fs.existsSync(cached)) return JSON.parse(fs.readFileSync(cached, "utf8"));
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: {
        "User-Agent": UA,
        Accept: "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ query }),
    });
    if (res.ok) {
      const rows = (await res.json()).results.bindings;
      fs.writeFileSync(cached, JSON.stringify(rows));
      return rows;
    }
    // El servei públic limita l'ús: si talla, s'espera i es torna a provar.
    if (attempt >= 3) throw new Error(`${name}: HTTP ${res.status} ${(await res.text()).slice(0, 160)}`);
    console.log(`  ${name}: HTTP ${res.status}, reintent ${attempt}…`);
    await sleep(5000 * attempt);
  }
}

const v = (r, k) => r[k]?.value;
const num = (r, k) => (r[k] ? Number(r[k].value) : null);
const year = (r, k) => (r[k] ? Number(String(r[k].value).slice(0, 4)) * (String(r[k].value).startsWith("-") ? -1 : 1) : null);
/** Es queda amb una fila per entitat (les dades repetides de Wikidata en donen diverses). */
const byId = (rows, key = "item") => {
  const m = new Map();
  for (const r of rows) if (!m.has(v(r, key))) m.set(v(r, key), r);
  return [...m.values()];
};

const data = {};

// ── CIÈNCIA ────────────────────────────────────────────────────────────────
data.elements = byId(await sparql("elements", `
SELECT ?item ?ca ?symbol ?number ?mass ?sitelinks WHERE {
  ?item wdt:P31 wd:Q11344; wdt:P246 ?symbol; wdt:P1086 ?number.
  OPTIONAL { ?item wdt:P2067 ?mass. }
  ?item wikibase:sitelinks ?sitelinks.
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
} ORDER BY ?number`), "item").map((r) => ({
  label: v(r, "ca"), symbol: v(r, "symbol"), number: num(r, "number"),
  mass: num(r, "mass"), fame: num(r, "sitelinks"),
}));

data.planets = byId(await sparql("planets", `
SELECT ?item ?ca ?radius ?period ?dist ?sitelinks WHERE {
  VALUES ?class { wd:Q634 wd:Q3419035 wd:Q2199 }
  ?item wdt:P31 ?class.
  OPTIONAL { ?item wdt:P2120 ?radius. }
  OPTIONAL { ?item wdt:P2146 ?period. }
  OPTIONAL { ?item wdt:P2244 ?dist. }
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > 25)
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
}`), "item").map((r) => ({
  label: v(r, "ca"), radius: num(r, "radius"), period: num(r, "period"),
  dist: num(r, "dist"), fame: num(r, "sitelinks"),
}));

// DESCARTAT: la propietat P575 ("data de descobriment") està plena d'objectes
// astronòmics (galàxies, cúmuls, asteroides). Generava preguntes com "en quin any es va
// descobrir Messier 22?" i cronologies incoherents. No hi ha manera de filtrar-ho net.
data.scientists = byId(await sparql("scientists", `
SELECT ?item ?ca ?birth ?death ?sitelinks WHERE {
  ?item wdt:P106 ?occ. VALUES ?occ { wd:Q169470 wd:Q593644 wd:Q864503 wd:Q11063 wd:Q1650915 }
  ?item wdt:P569 ?birth.
  OPTIONAL { ?item wdt:P570 ?death. }
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > 60)
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
  FILTER(YEAR(?birth) > 1200 && YEAR(?birth) < 1990)
} LIMIT 400`), "item").map((r) => ({
  label: v(r, "ca"), birth: year(r, "birth"), death: year(r, "death"), fame: num(r, "sitelinks"),
}));

// ── HISTÒRIA ───────────────────────────────────────────────────────────────
data.events = byId(await sparql("events", `
SELECT ?item ?ca ?date ?sitelinks WHERE {
  VALUES ?class { wd:Q178561 wd:Q198 wd:Q625298 wd:Q10931 wd:Q131569 wd:Q3199915 }
  ?item wdt:P31 ?class.
  { ?item wdt:P585 ?date. } UNION { ?item wdt:P580 ?date. }
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > 45)
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
  FILTER(YEAR(?date) > -800 && YEAR(?date) < 2020)
} ORDER BY ?date LIMIT 500`), "item").map((r) => ({
  label: v(r, "ca"), year: year(r, "date"), fame: num(r, "sitelinks"),
}));

data.leaders = byId(await sparql("leaders", `
SELECT ?item ?ca ?birth ?death ?sitelinks WHERE {
  ?item wdt:P106 ?occ. VALUES ?occ { wd:Q116 wd:Q372436 wd:Q189290 wd:Q82955 }
  ?item wdt:P569 ?birth. ?item wdt:P570 ?death.
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > 90)
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
  FILTER(YEAR(?birth) > -600 && YEAR(?birth) < 1980)
} LIMIT 300`), "item").map((r) => ({
  label: v(r, "ca"), birth: year(r, "birth"), death: year(r, "death"), fame: num(r, "sitelinks"),
}));

// ── CULTURA ────────────────────────────────────────────────────────────────
data.films = byId(await sparql("films", `
SELECT ?item ?ca ?date ?directorLabel ?sitelinks WHERE {
  ?item wdt:P31 wd:Q11424; wdt:P577 ?date; wdt:P57 ?director.
  ?director rdfs:label ?directorLabel. FILTER(LANG(?directorLabel) = "ca")
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > 55)
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
  FILTER(YEAR(?date) > 1920 && YEAR(?date) < 2024)
} LIMIT 400`), "item").map((r) => ({
  label: v(r, "ca"), year: year(r, "date"), director: v(r, "directorLabel"), fame: num(r, "sitelinks"),
}));

data.paintings = byId(await sparql("paintings", `
SELECT ?item ?ca ?creatorLabel ?date ?sitelinks WHERE {
  ?item wdt:P31 wd:Q3305213; wdt:P170 ?creator.
  OPTIONAL { ?item wdt:P571 ?date. }
  ?creator rdfs:label ?creatorLabel. FILTER(LANG(?creatorLabel) = "ca")
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > 25)
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
} LIMIT 300`), "item").map((r) => ({
  label: v(r, "ca"), creator: v(r, "creatorLabel"), year: year(r, "date"), fame: num(r, "sitelinks"),
}));

// Les edicions dels Jocs Olímpics no hi ha manera de treure-les (el servei retorna buit
// o 502 segons com es demanin), així que la cultura s'alimenta de llibres i quadres.
data.books = byId(await sparql("books", `
SELECT ?item ?ca ?authorLabel ?date ?sitelinks WHERE {
  ?item wdt:P31 wd:Q7725634; wdt:P50 ?author.
  OPTIONAL { ?item wdt:P577 ?date. }
  ?author rdfs:label ?authorLabel. FILTER(LANG(?authorLabel) = "ca")
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > 35)
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
} LIMIT 400`), "item").map((r) => ({
  label: v(r, "ca"), author: v(r, "authorLabel"), year: year(r, "date"), fame: num(r, "sitelinks"),
}));

// ── NATURA ─────────────────────────────────────────────────────────────────
// DESCARTAT: les masses d'animals (P2067) barregen unitats i significats. Fins i tot
// demanant el valor normalitzat a SI sortia "tigre: 1,19 kg" i mitja dotzena d'espècies
// amb el mateix 0,062. Preferim no tenir preguntes d'animals que tenir-les malament.
// ── NATURA ─────────────────────────────────────────────────────────────────
// Recórrer l'arbre taxonòmic és car (els peixos i els insectes fan caure el servei),
// però acotat per classe i per fama aguanta. S'aprofita la mateixa consulta per treure
// el NOM CIENTÍFIC, que sol seria una consulta massa gran per al servei públic.
const TAXON_CLASSES = [
  ["mamífer", "Q7377", 70],
  ["ocell", "Q5113", 70],
  ["rèptil", "Q10811", 70],
  ["amfibi", "Q10908", 30],
];
data.taxa = [];
for (const [group, qid, minFame] of TAXON_CLASSES) {
  const rows = byId(await sparql(`taxa-${qid}`, `
SELECT ?item ?ca ?taxon ?sitelinks WHERE {
  ?item wdt:P171* wd:${qid}; wdt:P105 wd:Q7432; wdt:P225 ?taxon.
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > ${minFame})
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
} LIMIT 150`), "item");
  for (const r of rows) {
    data.taxa.push({ label: v(r, "ca"), taxon: v(r, "taxon"), group, fame: num(r, "sitelinks") });
  }
}

fs.writeFileSync(OUT, JSON.stringify({
  source: "Wikidata (query.wikidata.org) — CC0 1.0",
  generatedAt: new Date().toISOString().slice(0, 10),
  note: "Només ítems amb etiqueta en català. `fame` = nombre de wikis on existeix l'article.",
  ...data,
}, null, 0));

for (const [k, rows] of Object.entries(data)) console.log(`  ${k.padEnd(12)} ${rows.length}`);
console.log(`\n→ ${path.basename(OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} kB)`);
