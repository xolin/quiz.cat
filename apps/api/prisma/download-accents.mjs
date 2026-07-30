// Baixa clips de veu etiquetats per VARIETAT DIALECTAL per al tipus "audio_clip".
//
//   node prisma/download-accents.mjs [clips-per-varietat]
//
// Origen i drets:
//   · Àudio: Mozilla Common Voice 17 en català — CC0 (domini públic).
//     Mozilla el serveix rere registre, però n'hi ha mirall públic a Hugging Face.
//   · Etiquetes de varietat: Projecte AINA / BSC (commonvoice_benchmark_catalan_accents),
//     CC BY 4.0 — ús comercial permès amb atribució. Surten de la varietat que declara
//     el mateix parlant al seu perfil, normalitzada a 5 categories.
//   · Les condicions de Common Voice prohibeixen intentar identificar els parlants:
//     no desem mai el `client_id`, només el clip i la varietat.
//
// Els clips viuen dins de tars d'1,5 GB, així que es llegeixen EN STREAMING i es talla
// la descàrrega quan les quotes estan plenes (normalment sense arribar al final del tar).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../web/public/accents");
const CACHE = path.join(__dirname, ".cv-cache");
const MANIFEST = path.join(__dirname, "accents-manifest.json");

const AINA = "https://huggingface.co/datasets/projecte-aina/commonvoice_benchmark_catalan_accents/resolve/main/corpus/files";
const MIRROR = "https://huggingface.co/datasets/fsicoli/common_voice_17_0/resolve/main/audio/ca";
// Es proven per ordre; es para quan totes les varietats tenen la quota plena.
const TARS = ["dev/ca_dev_0.tar", "test/ca_test_0.tar", "train/ca_train_0.tar", "train/ca_train_1.tar"];

// Nom intern → etiqueta en català. "northern" = català septentrional (Catalunya Nord).
const ACCENTS = {
  balearic: "Balear",
  central: "Central",
  northern: "Septentrional",
  northwestern: "Nord-occidental",
  valencian: "Valencià",
};
const GENDERS = ["female", "male"];
const PER_ACCENT = Number(process.argv[2] ?? 40);
const PER_CELL = Math.ceil(PER_ACCENT / GENDERS.length);

// Clips ni massa curts (no s'hi sent l'accent) ni massa llargs (avorreixen la ronda).
const MIN_MS = 3000;
const MAX_MS = 8000;

async function tsv(name) {
  fs.mkdirSync(CACHE, { recursive: true });
  const cached = path.join(CACHE, name);
  if (!fs.existsSync(cached)) {
    const res = await fetch(`${AINA}/${name}`);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    fs.writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
  }
  const [head, ...lines] = fs.readFileSync(cached, "utf8").trim().split("\n");
  const cols = head.split("\t");
  return lines.map((l) => Object.fromEntries(l.split("\t").map((v, i) => [cols[i], v])));
}

// ── 1) Quins clips volem, i de quina varietat ──────────────────────────────
const wanted = new Map(); // fitxer → { accent, gender, sentence, durationMs }
for (const accent of Object.keys(ACCENTS)) {
  for (const gender of GENDERS) {
    const rows = await tsv(`${accent}_${gender}.tsv`);
    for (const r of rows) {
      const ms = Number(r.duration);
      if (!Number.isFinite(ms) || ms < MIN_MS || ms > MAX_MS) continue;
      if (Number(r.down_votes) > 0 || Number(r.up_votes) < 2) continue; // validat per la comunitat
      wanted.set(r.path, { accent, gender, sentence: r.sentence, durationMs: ms });
    }
  }
}
console.log(`Candidats etiquetats: ${wanted.size} clips de ${Object.keys(ACCENTS).length} varietats.`);

// ── 2) Buidar els tars en streaming fins a omplir les quotes ───────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
const got = {}; // "accent|gender" → nombre de clips ja desats
const manifest = [];
const cell = (a, g) => `${a}|${g}`;
const full = () =>
  Object.keys(ACCENTS).every((a) => GENDERS.every((g) => (got[cell(a, g)] ?? 0) >= PER_CELL));

/** Llegeix un tar POSIX per sobre d'un stream i crida onFile(nom, contingut). */
async function streamTar(url, onFile) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const reader = res.body.getReader();
  let buf = Buffer.alloc(0);
  let read = 0;
  let lastLog = 0;
  let stop = false;

  while (!stop) {
    const { done, value } = await reader.read();
    if (done) break;
    read += value.length;
    buf = Buffer.concat([buf, Buffer.from(value)]);

    // Capçalera (512 B) + dades farcides a múltiples de 512.
    for (;;) {
      if (buf.length < 512) break;
      const name = buf.toString("utf8", 0, 100).replace(/\0.*$/, "");
      if (!name) { // dos blocs de zeros = final del tar
        stop = true;
        break;
      }
      const size = parseInt(buf.toString("utf8", 124, 136).replace(/\0.*$/, "").trim(), 8) || 0;
      const padded = Math.ceil(size / 512) * 512;
      if (buf.length < 512 + padded) break; // encara no ha arribat tot el fitxer
      const body = buf.subarray(512, 512 + size);
      if (onFile(path.basename(name), body) === "prou") stop = true;
      buf = buf.subarray(512 + padded);
      if (stop) break;
    }
    if (read - lastLog > 25e6) { // sense això el progrés omple la consola de línies
      lastLog = read;
      console.log(`  ${(read / 1e6).toFixed(0)} MB llegits · ${manifest.length} clips`);
    }
  }
  await reader.cancel().catch(() => {});
  console.log("");
  return read;
}

for (const tar of TARS) {
  if (full()) break;
  console.log(`Buidant ${tar}…`);
  await streamTar(`${MIRROR}/${tar}`, (name, body) => {
    const meta = wanted.get(name);
    if (!meta) return;
    const key = cell(meta.accent, meta.gender);
    if ((got[key] ?? 0) >= PER_CELL) return;
    fs.writeFileSync(path.join(OUT_DIR, name), body);
    got[key] = (got[key] ?? 0) + 1;
    manifest.push({
      file: `/accents/${name}`,
      accent: meta.accent,
      label: ACCENTS[meta.accent],
      gender: meta.gender,
      sentence: meta.sentence,
      durationMs: meta.durationMs,
      license: "cc0",
      attribution: "Mozilla Common Voice 17 (CC0) · etiquetes: Projecte AINA / BSC (CC BY 4.0)",
      source: "https://commonvoice.mozilla.org/ca/datasets",
    });
    return full() ? "prou" : undefined;
  });
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

// L'àudio és CC0 (no exigiria citar), però les etiquetes de varietat són CC BY 4.0 i SÍ
// que obliguen a atribuir. Es deixa el crèdit escrit al costat dels fitxers.
fs.writeFileSync(
  path.join(OUT_DIR, "CREDITS.md"),
  `# Crèdits dels clips de veu

**Àudio:** [Mozilla Common Voice](https://commonvoice.mozilla.org/ca/datasets) 17, en català — **CC0 1.0** (domini públic).
Veus donades per voluntaris. Les condicions de Common Voice prohibeixen intentar identificar
els parlants: en aquest projecte no es desa ni es mostra cap identificador de parlant.

**Etiquetes de varietat dialectal:** [Projecte AINA / BSC-CNS](https://huggingface.co/datasets/projecte-aina/commonvoice_benchmark_catalan_accents)
(\`commonvoice_benchmark_catalan_accents\`) — **CC BY 4.0**. La varietat és la que declara el
mateix parlant al seu perfil, normalitzada a 5 categories.

Clips: ${manifest.length} · generat per \`prisma/download-accents.mjs\` (${new Date().toISOString().slice(0, 10)}).
`,
);
console.log(`\nDesats ${manifest.length} clips a web/public/accents:`);
for (const a of Object.keys(ACCENTS)) {
  console.log(`  ${ACCENTS[a].padEnd(16)} ${GENDERS.map((g) => `${g}=${got[cell(a, g)] ?? 0}`).join(" · ")}`);
}
if (!full()) console.log("⚠ Alguna varietat no ha arribat a la quota: afegeix més tars a TARS i torna-ho a executar.");
