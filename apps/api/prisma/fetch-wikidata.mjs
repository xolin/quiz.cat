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
    // El `try` cobreix el `fetch` I el `json()`: amb les consultes pesades, el servei no
    // sempre respon amb un codi d'error — de vegades tanca el socket a mitja resposta, o
    // la retorna tallada i el JSON no es pot llegir. Abans això sortia del bucle com una
    // excepció i es carregava tota la descàrrega, perdent també el que ja havia baixat.
    let error;
    try {
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
      error = `HTTP ${res.status} ${(await res.text()).slice(0, 120).replace(/\s+/g, " ")}`;
    } catch (e) {
      error = e.message.slice(0, 120);
    }
    // El servei públic limita l'ús: si talla, s'espera i es torna a provar. Cinc intents amb
    // espera creixent, que les consultes grosses en solen necessitar més d'un.
    if (attempt >= 5) throw new Error(`${name}: ${error}`);
    console.log(`  ${name}: ${error}, reintent ${attempt}…`);
    await sleep(6000 * attempt);
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

// ── MÚSICA (cultura) ───────────────────────────────────────────────────────
// Era el forat més gran del pou: zero preguntes de música en un joc de trivia.
data.musicians = byId(await sparql("musicians", `
SELECT ?item ?ca ?birth ?death ?sitelinks WHERE {
  ?item wdt:P106 ?occ. VALUES ?occ { wd:Q36834 wd:Q177220 wd:Q639669 wd:Q753110 wd:Q855091 }
  ?item wdt:P569 ?birth.
  OPTIONAL { ?item wdt:P570 ?death. }
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > 70)
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
  FILTER(YEAR(?birth) > 1500 && YEAR(?birth) < 2005)
} LIMIT 500`), "item").map((r) => ({
  label: v(r, "ca"), birth: year(r, "birth"), death: year(r, "death"), fame: num(r, "sitelinks"),
}));

data.albums = byId(await sparql("albums", `
SELECT ?item ?ca ?performerLabel ?date ?sitelinks WHERE {
  ?item wdt:P31 wd:Q482994; wdt:P175 ?performer; wdt:P577 ?date.
  ?performer rdfs:label ?performerLabel. FILTER(LANG(?performerLabel) = "ca")
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > 22)
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
  FILTER(YEAR(?date) > 1950 && YEAR(?date) < 2025)
} LIMIT 500`), "item").map((r) => ({
  label: v(r, "ca"), performer: v(r, "performerLabel"), year: year(r, "date"), fame: num(r, "sitelinks"),
}));

data.bands = byId(await sparql("bands", `
SELECT ?item ?ca ?inception ?countryLabel ?sitelinks WHERE {
  ?item wdt:P31 wd:Q215380; wdt:P571 ?inception.
  OPTIONAL { ?item wdt:P495 ?country. ?country rdfs:label ?countryLabel. FILTER(LANG(?countryLabel)="ca") }
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > 45)
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
} LIMIT 400`), "item").map((r) => ({
  label: v(r, "ca"), year: year(r, "inception"), country: v(r, "countryLabel"), fame: num(r, "sitelinks"),
}));

// ── ESPORT (cultura, etiquetat `esport`) ───────────────────────────────────
// Una consulta sola amb totes les ocupacions tomba el servei (504 i respostes tallades),
// igual que passava amb els tàxons. Partida per ocupació, aguanta.
const SPORT_OCCUPATIONS = [
  ["futbolista", "Q937857", 45],
  ["basquet", "Q3665646", 40],
  ["tennista", "Q10833314", 35],
  ["ciclista", "Q2309784", 30],
  ["nedador", "Q10843402", 30],
  ["atleta", "Q11513337", 35],
  ["pilot", "Q378622", 35],
  // DESCARTAT els escacs (Q10873124): és l'ocupació que més gent famosa per ALTRES coses
  // arrossega, perquè `P641` marca qualsevol que hagi competit. En sortien preguntes com
  // «en quin esport va destacar Peter Thiel?», que és certa i alhora absurda.
];
data.athletes = [];
for (const [slug, qid, minFame] of SPORT_OCCUPATIONS) {
  const rows = byId(await sparql(`athletes-${qid}`, `
SELECT ?item ?ca ?sportLabel ?birth ?sitelinks WHERE {
  ?item wdt:P106 wd:${qid}; wdt:P641 ?sport; wdt:P569 ?birth.
  ?sport rdfs:label ?sportLabel. FILTER(LANG(?sportLabel) = "ca")
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > ${minFame})
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
  FILTER(YEAR(?birth) > 1890)
} LIMIT 250`), "item");
  for (const r of rows) {
    data.athletes.push({
      label: v(r, "ca"), sport: v(r, "sportLabel"), birth: year(r, "birth"),
      occupation: slug, fame: num(r, "sitelinks"),
    });
  }
}
// Un mateix esportista pot sortir per dues ocupacions (P106 en porta diverses).
data.athletes = [...new Map(data.athletes.map((a) => [a.label, a])).values()];

data.clubs = byId(await sparql("clubs", `
SELECT ?item ?ca ?inception ?countryLabel ?sitelinks WHERE {
  ?item wdt:P31 wd:Q476028; wdt:P571 ?inception.
  OPTIONAL { ?item wdt:P17 ?country. ?country rdfs:label ?countryLabel. FILTER(LANG(?countryLabel)="ca") }
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > 65)
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
} LIMIT 400`), "item").map((r) => ({
  label: v(r, "ca"), year: year(r, "inception"), country: v(r, "countryLabel"), fame: num(r, "sitelinks"),
}));

// ── CATALUNYA (geografia) ──────────────────────────────────────────────────
// El diferencial: contingut que cap altre joc de trivia genera. Surten els 947 municipis
// amb població, comarca i coordenades — o sigui que també donen preguntes de mapa.
// Compte amb el QID: `Q33146` és una altra cosa; el bo és `Q33146843`.
data.municipis = byId(await sparql("municipis", `
SELECT ?item ?ca ?pop ?comarcaLabel ?lat ?lon ?sitelinks WHERE {
  ?item wdt:P31 wd:Q33146843.
  OPTIONAL { ?item wdt:P1082 ?pop. }
  OPTIONAL { ?item wdt:P131 ?comarca. ?comarca rdfs:label ?comarcaLabel. FILTER(LANG(?comarcaLabel)="ca") }
  OPTIONAL { ?item p:P625/psv:P625 ?c. ?c wikibase:geoLatitude ?lat; wikibase:geoLongitude ?lon. }
  ?item wikibase:sitelinks ?sitelinks.
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
} LIMIT 2000`), "item").map((r) => ({
  label: v(r, "ca"), pop: num(r, "pop"), comarca: v(r, "comarcaLabel"),
  lat: num(r, "lat"), lon: num(r, "lon"), fame: num(r, "sitelinks"),
}));

data.comarques = byId(await sparql("comarques", `
SELECT ?item ?ca ?pop ?area ?capitalLabel ?sitelinks WHERE {
  ?item wdt:P31 wd:Q937876.
  OPTIONAL { ?item wdt:P1082 ?pop. }
  OPTIONAL { ?item wdt:P2046 ?area. }
  OPTIONAL { ?item wdt:P36 ?cap. ?cap rdfs:label ?capitalLabel. FILTER(LANG(?capitalLabel)="ca") }
  ?item wikibase:sitelinks ?sitelinks.
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
} LIMIT 100`), "item").map((r) => ({
  label: v(r, "ca"), pop: num(r, "pop"), area: num(r, "area"),
  capital: v(r, "capitalLabel"), fame: num(r, "sitelinks"),
}));

// ── REGIONS D'EUROPA (geografia) ───────────────────────────────────────────
// Seccions regionals triables: nacions sense estat i països amb què el públic català té
// afinitat. De cadascuna se'n treuen les CIUTATS amb població i coordenades, que donen
// mapa, comparació i estimació amb els generadors que ja hi ha.
//
// Dos modes, i la diferència no és estètica:
//   · `admin` (P131*) recorre la jerarquia administrativa cap avall des d'una regió. És
//     barat perquè el subarbre és petit, i és l'únic que funciona per a Occitània o Galícia.
//   · `country` (P17) ha de mirar TOT el que pertany a un estat —centenars de milers de
//     comunes— i el servei públic el tomba sovint. La població va davant de tot a la
//     consulta justament per això: el conjunt d'ítems del món amb prou habitants és petit.
//
// Nota sobre les nacions sense estat: la jerarquia administrativa de Wikidata no penja
// d'Euskal Herria ni de l'Occitània cultural, sinó de les divisions dels estats. Per això
// Euskal Herria es demana per Euskadi + Navarra (queda fora Iparralde) i Occitània per la
// regió administrativa francesa (que sí que inclou la Catalunya Nord).
const REGIONS = [
  ["euskalherria", "admin", ["Q3995", "Q4018"], 8000, 12],
  ["galicia", "admin", ["Q3908"], 8000, 12],
  ["occitania", "admin", ["Q18678265"], 8000, 12],
  ["brusselles", "admin", ["Q240"], 5000, 10],
  ["franca", "country", ["Q142"], 60000, 30],
  ["italia", "country", ["Q38"], 60000, 30],
  ["alemanya", "country", ["Q183"], 60000, 30],
  ["paisosbaixos", "country", ["Q55"], 40000, 25],
  ["suecia", "country", ["Q34"], 25000, 22],
  ["noruega", "country", ["Q20"], 15000, 20],
  ["suissa", "country", ["Q39"], 20000, 22],
  ["austria", "country", ["Q40"], 20000, 22],
  ["txequia", "country", ["Q213"], 25000, 22],
  ["ucraina", "country", ["Q212"], 40000, 25],
];
data.regionCities = {};
for (const [slug, mode, qids, minPop, minFame] of REGIONS) {
  const where = mode === "admin"
    ? `?item wdt:P131* ?region. VALUES ?region { ${qids.map((q) => `wd:${q}`).join(" ")} }`
    : `?item wdt:P17 wd:${qids[0]}.`;
  try {
    const rows = byId(await sparql(`cities-${slug}`, `
SELECT ?item ?ca ?pop ?lat ?lon ?sitelinks WHERE {
  ?item wdt:P1082 ?pop. FILTER(?pop > ${minPop})
  ?item wdt:P31 ?class. ?class wdt:P279* wd:Q486972.
  ${where}
  ?item p:P625/psv:P625 ?c. ?c wikibase:geoLatitude ?lat; wikibase:geoLongitude ?lon.
  ?item wikibase:sitelinks ?sitelinks. FILTER(?sitelinks > ${minFame})
  ?item rdfs:label ?ca. FILTER(LANG(?ca) = "ca")
} LIMIT 250`), "item");
    data.regionCities[slug] = rows.map((r) => ({
      label: v(r, "ca"), pop: num(r, "pop"), lat: num(r, "lat"), lon: num(r, "lon"), fame: num(r, "sitelinks"),
    }));
  } catch (e) {
    // Una regió que no s'acaba de baixar NO ha de tombar la resta: es queda sense tema i ja
    // està. El seed només crea les seccions que tenen contingut de debò.
    console.log(`  cities-${slug}: sense dades (${e.message.slice(0, 70)})`);
    data.regionCities[slug] = [];
  }
}

fs.writeFileSync(OUT, JSON.stringify({
  source: "Wikidata (query.wikidata.org) — CC0 1.0",
  generatedAt: new Date().toISOString().slice(0, 10),
  note: "Només ítems amb etiqueta en català. `fame` = nombre de wikis on existeix l'article.",
  ...data,
}, null, 0));

for (const [k, rows] of Object.entries(data)) {
  if (Array.isArray(rows)) console.log(`  ${k.padEnd(14)} ${rows.length}`);
  else for (const [sub, r] of Object.entries(rows)) console.log(`  ${(k + ":" + sub).padEnd(28)} ${r.length}`);
}
console.log(`\n→ ${path.basename(OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} kB)`);
