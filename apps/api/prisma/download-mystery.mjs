// Descarrega imatges principals de la Viquipèdia (REST summary) per a "Foto misteriosa".
// Guarda-les a apps/web/public/mystery i escriu un manifest amb atribució (pàgina font).
// AVÍS: la llicència concreta de cada imatge s'ha de VERIFICAR abans de publicar (veure decisions.md).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../web/public/mystery");
fs.mkdirSync(OUT_DIR, { recursive: true });

// slug de Viquipèdia (en) · etiqueta (ca) · grup (les opcions surten del mateix grup)
const SUBJECTS = [
  ["Tiger", "Tigre", "animals"],
  ["African_bush_elephant", "Elefant", "animals"],
  ["Giraffe", "Girafa", "animals"],
  ["Emperor_penguin", "Pingüí", "animals"],
  ["Red_kangaroo", "Cangur", "animals"],
  ["Polar_bear", "Ós polar", "animals"],
  ["Plains_zebra", "Zebra", "animals"],
  ["Lion", "Lleó", "animals"],
  ["Giant_panda", "Ós panda", "animals"],
  ["Flamingo", "Flamenc", "animals"],
  ["Eiffel_Tower", "Torre Eiffel", "monuments"],
  ["Colosseum", "Coliseu", "monuments"],
  ["Taj_Mahal", "Taj Mahal", "monuments"],
  ["Statue_of_Liberty", "Estàtua de la Llibertat", "monuments"],
  ["Sagrada_Família", "Sagrada Família", "monuments"],
  ["Big_Ben", "Big Ben", "monuments"],
  ["Great_Pyramid_of_Giza", "Piràmides de Gizeh", "monuments"],
  ["Machu_Picchu", "Machu Picchu", "monuments"],
  ["Sydney_Opera_House", "Òpera de Sydney", "monuments"],
  ["Brandenburg_Gate", "Porta de Brandenburg", "monuments"],
];

// Wikimedia bloqueja UA no-navegador i només serveix certs buckets d'amplada (500 sí, 640 no).
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const manifest = [];
for (const [slug, label, group] of SUBJECTS) {
  const file = `${slug.toLowerCase()}.jpg`;
  const dest = path.join(OUT_DIR, file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 3000) {
    manifest.push({ file: `/mystery/${file}`, label, group, source: `https://en.wikipedia.org/wiki/${slug}` });
    console.log("CACHE", slug);
    continue;
  }
  await sleep(2500); // respecta el rate limit de Wikimedia
  try {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
      headers: { "user-agent": UA },
    });
    if (!r.ok) { console.log("SKIP", slug, r.status); continue; }
    const j = await r.json();
    let src = j.thumbnail?.source ?? j.originalimage?.source;
    if (!src) { console.log("NO IMG", slug); continue; }
    src = src.replace(/\/(\d+)px-/, "/500px-"); // bucket d'amplada permès
    const img = await fetch(src, { headers: { "user-agent": UA } });
    if (!img.ok) { console.log("IMG FAIL", slug, img.status); continue; }
    const buf = Buffer.from(await img.arrayBuffer());
    if (buf.length < 3000) { console.log("TOO SMALL", slug, buf.length); continue; }
    fs.writeFileSync(dest, buf);
    manifest.push({ file: `/mystery/${file}`, label, group, source: j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${slug}` });
    console.log("OK", slug, `${(buf.length / 1024).toFixed(0)}kB`);
  } catch (e) {
    console.log("ERR", slug, String(e).slice(0, 60));
  }
}

fs.writeFileSync(path.join(__dirname, "mystery-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nManifest: ${manifest.length} imatges (${manifest.filter((m) => m.group === "animals").length} animals, ${manifest.filter((m) => m.group === "monuments").length} monuments)`);
