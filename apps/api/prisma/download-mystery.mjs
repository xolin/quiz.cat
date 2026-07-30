// Imatges per a "Foto misteriosa", amb la llicència VERIFICADA contra Commons.
//
// El primer intent es limitava a baixar la imatge principal de la Viquipèdia i deixava
// escrit "llicència per verificar". No serveix: la imatge principal pot ser CC BY-SA (que
// obliga a acreditar l'autor), i alguna pot ser d'ús legítim (que no es pot fer servir).
// Ara, per a cada imatge: es demana el fitxer a Commons, es llegeix la llicència real i
// **només passa si és d'una llista de llicències lliures**. L'autoria acompanya el joc.
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

// Llicències acceptades. Qualsevol altra cosa (ús legítim, no comercial, sense derivades)
// queda fora: el joc és públic i pot ser comercial.
const OK_LICENSE = /^(cc0|cc[ -]by(-sa)?([ -][0-9.]+)*( [a-z]{2})?|public domain|pd(-[a-z0-9-]+)?)$/i;

const UA = "quizcat/1.0 (+https://quiz.cat) node-fetch";
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// L'autoria arriba com a HTML (enllaços, cursives). Per posar-la a la pantalla cal text pla.
function plain(html) {
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160) || null;
}

// De la URL de la miniatura de Commons se'n treu el nom del fitxer, que és la clau per
// preguntar-ne la llicència: .../commons/thumb/a/ab/Nom.jpg/500px-Nom.jpg
function commonsFileFrom(url) {
  const m = url.match(/\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function licenseOf(file) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query", titles: `File:${file}`, prop: "imageinfo",
    iiprop: "extmetadata", format: "json", formatversion: "2",
  }).toString();
  const r = await fetch(api, { headers: { "user-agent": UA } });
  if (!r.ok) return { error: `commons ${r.status}` };
  const page = (await r.json())?.query?.pages?.[0];
  const meta = page?.imageinfo?.[0]?.extmetadata;
  if (!meta) return { error: "sense metadades a Commons" };
  return {
    license: meta.LicenseShortName?.value ?? null,
    licenseUrl: meta.LicenseUrl?.value ?? null,
    author: plain(meta.Artist?.value) ?? plain(meta.Credit?.value),
    restrictions: meta.Restrictions?.value || null,
  };
}

const manifest = [];
const rejected = [];

for (const [slug, label, group] of SUBJECTS) {
  const file = `${slug.toLowerCase()}.jpg`;
  const dest = path.join(OUT_DIR, file);
  await sleep(1200); // el rate limit de Wikimedia

  let src;
  try {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
      headers: { "user-agent": UA },
    });
    if (!r.ok) { console.log("SKIP", slug, r.status); continue; }
    const j = await r.json();
    src = j.thumbnail?.source ?? j.originalimage?.source;
    if (!src) { console.log("NO IMG", slug); continue; }
    src = src.replace(/\/(\d+)px-/, "/500px-"); // bucket d'amplada permès
  } catch (e) {
    console.log("ERR", slug, String(e).slice(0, 60));
    continue;
  }

  // La llicència es comprova SEMPRE, també quan la imatge ja és al disc: si no, una
  // imatge d'una execució antiga es quedaria per sempre sense verificar.
  const cf = commonsFileFrom(src);
  if (!cf) {
    rejected.push({ slug, why: "la imatge no és a Commons (pot ser local de la Viquipèdia)" });
    console.log("REJECT", slug, "no és de Commons");
    continue;
  }
  await sleep(1200);
  const lic = await licenseOf(cf);
  if (lic.error) {
    rejected.push({ slug, why: lic.error });
    console.log("REJECT", slug, lic.error);
    continue;
  }
  if (!lic.license || !OK_LICENSE.test(lic.license.trim())) {
    rejected.push({ slug, why: `llicència no lliure o desconeguda: ${lic.license ?? "cap"}` });
    console.log("REJECT", slug, lic.license ?? "sense llicència");
    continue;
  }

  if (!fs.existsSync(dest) || fs.statSync(dest).size < 3000) {
    try {
      const img = await fetch(src, { headers: { "user-agent": UA } });
      if (!img.ok) { console.log("IMG FAIL", slug, img.status); continue; }
      const buf = Buffer.from(await img.arrayBuffer());
      if (buf.length < 3000) { console.log("TOO SMALL", slug, buf.length); continue; }
      fs.writeFileSync(dest, buf);
      console.log("OK", slug, `${(buf.length / 1024).toFixed(0)}kB`, lic.license);
    } catch (e) {
      console.log("ERR", slug, String(e).slice(0, 60));
      continue;
    }
  } else {
    console.log("CACHE", slug, lic.license);
  }

  manifest.push({
    file: `/mystery/${file}`, label, group,
    source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(cf)}`,
    license: lic.license.trim(),
    licenseUrl: lic.licenseUrl,
    author: lic.author,
    restrictions: lic.restrictions,
  });
}

fs.writeFileSync(path.join(__dirname, "mystery-manifest.json"), JSON.stringify(manifest, null, 2));

const credits = [
  "# Crèdits de les imatges de «Foto misteriosa»",
  "",
  "Generat per `node apps/api/prisma/download-mystery.mjs`. Les imatges **no es versionen**;",
  "es tornen a baixar amb el mateix ordre. La llicència de cada fitxer es comprova contra",
  "Commons i només hi entren llicències lliures; l'autoria surt també dins del joc quan es",
  "revela la foto, que és el que demanen les CC BY i CC BY-SA.",
  "",
  ...manifest.map((m) =>
    `- **${m.label}** (${m.group}) — ${m.license}` +
    (m.author ? ` — ${m.author}` : " — autor no indicat a Commons") +
    ` — [fitxer](${m.source})` +
    (m.restrictions ? ` — restriccions: ${m.restrictions}` : "")),
];
if (rejected.length) {
  credits.push("", "## Descartades", "");
  for (const r of rejected) credits.push(`- ${r.slug} — ${r.why}`);
}
fs.writeFileSync(path.join(OUT_DIR, "CREDITS.md"), credits.join("\n") + "\n");

console.log(`\nManifest: ${manifest.length} imatges verificades` +
  (rejected.length ? `, ${rejected.length} descartades` : "") +
  ` (${manifest.filter((m) => m.group === "animals").length} animals, ` +
  `${manifest.filter((m) => m.group === "monuments").length} monuments)`);
