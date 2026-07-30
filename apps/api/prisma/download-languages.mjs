// Baixa clips de veu de diverses LLENGÜES per al tipus "audio_clip" ("quina llengua sona?").
//
//   node prisma/download-languages.mjs [clips-per-llengua]
//
// Mateixa font i mateixos drets que els accents: Mozilla Common Voice 17, CC0 (domini
// públic), des del mirall públic de Hugging Face. Aquí no calen etiquetes externes —
// la llengua ja és la carpeta del corpus.
//
// Es llegeix cada tar EN STREAMING i es talla de seguida: com que només volem els primers
// clips vàlids, es baixen uns pocs MB de cada tar (no els centenars que ocupen).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../web/public/languages");
const MANIFEST = path.join(__dirname, "languages-manifest.json");
const MIRROR = "https://huggingface.co/datasets/fsicoli/common_voice_17_0/resolve/main/audio";

// `group` serveix per triar distractors de la MATEIXA família: si no, "japonès vs castellà
// vs àrab vs alemany" es respon sense escoltar i la pregunta no val res.
const LANGS = [
  { locale: "es", label: "Castellà", group: "romànica", difficulty: 1 },
  { locale: "en", label: "Anglès", group: "germànica", difficulty: 1 },
  { locale: "fr", label: "Francès", group: "romànica", difficulty: 2 },
  { locale: "it", label: "Italià", group: "romànica", difficulty: 2 },
  { locale: "pt", label: "Portuguès", group: "romànica", difficulty: 3 },
  { locale: "gl", label: "Gallec", group: "romànica", difficulty: 4 },
  { locale: "de", label: "Alemany", group: "germànica", difficulty: 2 },
  { locale: "nl", label: "Neerlandès", group: "germànica", difficulty: 3 },
  { locale: "ru", label: "Rus", group: "eslava", difficulty: 3 },
  { locale: "pl", label: "Polonès", group: "eslava", difficulty: 3 },
  { locale: "eu", label: "Èuscar", group: "altres", difficulty: 3 },
  { locale: "el", label: "Grec", group: "altres", difficulty: 3 },
  { locale: "tr", label: "Turc", group: "altres", difficulty: 3 },
  { locale: "ar", label: "Àrab", group: "altres", difficulty: 2 },
  { locale: "ja", label: "Japonès", group: "altres", difficulty: 2 },
  { locale: "zh-CN", label: "Xinès (mandarí)", group: "altres", difficulty: 2 },
];

const PER_LANG = Number(process.argv[2] ?? 3);
// Sense metadades de durada: la mida del fitxer fa de substitut (Common Voice va a ~8 kB/s,
// o sigui que 25–70 kB ≈ 3–9 s). Prou per descartar clips buits o massa llargs.
const MIN_BYTES = 25_000;
const MAX_BYTES = 70_000;

/** Llegeix un tar POSIX per sobre d'un stream i crida onFile(nom, contingut). */
async function streamTar(url, onFile) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const reader = res.body.getReader();
  let buf = Buffer.alloc(0);
  let read = 0;
  let stop = false;

  while (!stop) {
    const { done, value } = await reader.read();
    if (done) break;
    read += value.length;
    buf = Buffer.concat([buf, Buffer.from(value)]);
    for (;;) {
      if (buf.length < 512) break;
      const name = buf.toString("utf8", 0, 100).replace(/\0.*$/, "");
      if (!name) { stop = true; break; }
      const size = parseInt(buf.toString("utf8", 124, 136).replace(/\0.*$/, "").trim(), 8) || 0;
      const typeflag = String.fromCharCode(buf[156]);
      const padded = Math.ceil(size / 512) * 512;
      if (buf.length < 512 + padded) break;
      const base = path.basename(name);
      // Només fitxers de debò: fora capçaleres Pax, directoris i brossa de macOS.
      const usable = (typeflag === "0" || typeflag === "\0") && base.endsWith(".mp3") && !base.startsWith("._");
      if (usable && onFile(base, buf.subarray(512, 512 + size)) === "prou") stop = true;
      buf = buf.subarray(512 + padded);
      if (stop) break;
    }
  }
  await reader.cancel().catch(() => {});
  return read;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const manifest = [];

for (const lang of LANGS) {
  let n = 0;
  const read = await streamTar(`${MIRROR}/${lang.locale}/dev/${lang.locale}_dev_0.tar`, (name, body) => {
    if (body.length < MIN_BYTES || body.length > MAX_BYTES) return;
    fs.writeFileSync(path.join(OUT_DIR, name), body);
    manifest.push({
      file: `/languages/${name}`,
      locale: lang.locale,
      label: lang.label,
      group: lang.group,
      difficulty: lang.difficulty,
      license: "cc0",
      attribution: "Mozilla Common Voice 17 (CC0)",
      source: `https://commonvoice.mozilla.org/${lang.locale}/datasets`,
    });
    return ++n >= PER_LANG ? "prou" : undefined;
  });
  console.log(`  ${lang.label.padEnd(18)} ${n} clips · ${(read / 1e6).toFixed(1)} MB llegits`);
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
fs.writeFileSync(
  path.join(OUT_DIR, "CREDITS.md"),
  `# Crèdits dels clips de llengües

**Àudio:** [Mozilla Common Voice](https://commonvoice.mozilla.org/) 17 — **CC0 1.0** (domini públic).
Veus donades per voluntaris de cada comunitat lingüística. Les condicions de Common Voice
prohibeixen intentar identificar els parlants: aquí no es desa cap identificador.

Llengües: ${LANGS.map((l) => l.label).join(", ")}.
Clips: ${manifest.length} · generat per \`prisma/download-languages.mjs\` (${new Date().toISOString().slice(0, 10)}).
`,
);
console.log(`\nDesats ${manifest.length} clips de ${LANGS.length} llengües a web/public/languages.`);
