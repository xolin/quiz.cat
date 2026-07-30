// Baixa clips d'INSTRUMENTS per al tipus "audio_clip" ("quin instrument sona?").
//
//   node prisma/download-instruments.mjs [clips-per-instrument]
//
// Dues fonts, totes dues d'ús comercial lliure:
//   · VCSL — Versilian Community Sample Library (github.com/sgossner/VCSL) — CC0.
//     Teclats, percussió i instruments del món. Els WAV pesen 7-9 MB, així que se'n
//     baixa NOMÉS EL PRINCIPI amb range requests i es reescriuen les mides del RIFF.
//   · TinySOL — IRCAM (Zenodo) — CC BY 4.0. El nucli d'orquestra (corda, metall, fusta).
//     És un .tar.gz de 898 MB: es descomprimeix en streaming i es talla quan hi ha prou.
//
// Els WAV es converteixen a AAC (~30 kB) amb `afconvert`, que ve amb macOS. Si no hi és,
// es desa el WAV retallat: el joc funciona igual, però els fitxers pesen més.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { Readable } from "node:stream";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../web/public/instruments");
const TMP = path.join(__dirname, ".instr-tmp");
const MANIFEST = path.join(__dirname, "instruments-manifest.json");
const TREE_CACHE = path.join(__dirname, ".vcsl-tree.json");
const VCSL_RAW = "https://raw.githubusercontent.com/sgossner/VCSL/master";
const VCSL_API = "https://api.github.com/repos/sgossner/VCSL/git/trees/master";
const TINYSOL = "https://zenodo.org/api/records/3659365/files/TinySOL.tar.gz/content";

const ONLY_VCSL = process.argv.includes("--vcsl"); // re-executa només la part barata
const PER_INSTRUMENT = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 3);
const CLIP_SECONDS = 3.5;

// `family` mana en els distractors: "violí vs viola vs violoncel" és una pregunta de debò,
// "violí vs timbals" no. Els noms van en català.
const VCSL = [
  { slug: "piano", label: "Piano", family: "teclat", dir: "Chordophones/Zithers/Grand Piano, Steinway B/Sus" },
  { slug: "clavicembal", label: "Clavicèmbal", family: "teclat", dir: "Chordophones/Zithers/Harpsichord, French/Sustains" },
  { slug: "orgue", label: "Orgue", family: "teclat", dir: "Aerophones/Edge-blown Aerophones/Pipe Organ/Loud" },
  { slug: "arpa", label: "Arpa", family: "corda pinçada", dir: "Chordophones/Composite Chordophones/Concert Harp" },
  { slug: "harmonica", label: "Harmònica", family: "vent (altres)", dir: "Aerophones/Free Aerophones/Harmonica-Hohner-Special20-C/Sustains" },
  { slug: "flauta-dolca", label: "Flauta dolça", family: "vent fusta", dir: "Aerophones/Edge-blown Aerophones/Baroque Alto Recorder/Sustain" },
  { slug: "marimba", label: "Marimba", family: "percussió", dir: "Idiophones/Struck Idiophones/Marimba" },
  { slug: "glockenspiel", label: "Glockenspiel", family: "percussió", dir: "Idiophones/Struck Idiophones/Glockenspiel" },
  { slug: "timbals", label: "Timbals", family: "percussió", dir: "Membranophones/Struck Membranophones/Timpani 1/Hit" },
  { slug: "congues", label: "Congues", family: "percussió", dir: "Membranophones/Struck Membranophones/Conga" },
  { slug: "kalimba", label: "Kalimba", family: "vent (altres)", dir: "Idiophones/Plucked Idiophones/Kalimba, Kenya" },
  { slug: "didgeridoo", label: "Didgeridoo", family: "vent (altres)", dir: "Aerophones/Lip Aerophones/Didgeridoo" },
];

// Nom de carpeta dins de TinySOL → etiqueta i família.
const SOL = {
  Violin: { slug: "violi", label: "Violí", family: "corda fregada" },
  Viola: { slug: "viola", label: "Viola", family: "corda fregada" },
  Violoncello: { slug: "violoncel", label: "Violoncel", family: "corda fregada" },
  Contrabass: { slug: "contrabaix", label: "Contrabaix", family: "corda fregada" },
  Trumpet_C: { slug: "trompeta", label: "Trompeta", family: "metall" },
  Trombone: { slug: "trombo", label: "Trombó", family: "metall" },
  Horn: { slug: "trompa", label: "Trompa", family: "metall" },
  Bass_Tuba: { slug: "tuba", label: "Tuba", family: "metall" },
  Flute: { slug: "flauta", label: "Flauta travessera", family: "vent fusta" },
  Oboe: { slug: "oboe", label: "Oboè", family: "vent fusta" },
  Clarinet_Bb: { slug: "clarinet", label: "Clarinet", family: "vent fusta" },
  Bassoon: { slug: "fagot", label: "Fagot", family: "vent fusta" },
  Sax_Alto: { slug: "saxo", label: "Saxo alt", family: "vent fusta" },
  Accordion: { slug: "acordio", label: "Acordió", family: "vent (altres)" },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });
const manifest = [];
let afconvert = true;
try { execFileSync("which", ["afconvert"], { stdio: "ignore" }); } catch { afconvert = false; }
if (!afconvert) console.log("⚠ Sense afconvert: es desaran WAV retallats (més pesants).");

/** Retalla un WAF WAV parcial i li arregla les mides perquè torni a ser vàlid. */
function fixWav(buf) {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;
  let off = 12;
  let byteRate = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") byteRate = buf.readUInt32LE(off + 16);
    if (id === "data") {
      const available = buf.length - (off + 8);
      let dataSize = Math.min(size, available);
      if (byteRate) dataSize = Math.min(dataSize, Math.floor(byteRate * CLIP_SECONDS));
      if (dataSize < 4096) return null;
      const out = Buffer.from(buf.subarray(0, off + 8 + dataSize));
      out.writeUInt32LE(dataSize, off + 4);
      out.writeUInt32LE(out.length - 8, 4);
      return out;
    }
    off += 8 + size + (size % 2);
  }
  return null;
}

/** Desa el clip final (AAC si es pot) i l'apunta al manifest. */
function save(wav, slug, n, meta) {
  const base = `${slug}-${n}`;
  const tmpWav = path.join(TMP, `${base}.wav`);
  fs.writeFileSync(tmpWav, wav);
  let file;
  if (afconvert) {
    file = `${base}.m4a`;
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "64000", tmpWav, path.join(OUT_DIR, file)]);
  } else {
    file = `${base}.wav`;
    fs.copyFileSync(tmpWav, path.join(OUT_DIR, file));
  }
  fs.unlinkSync(tmpWav);
  manifest.push({ file: `/instruments/${file}`, ...meta });
}

// ── VCSL (CC0) ─────────────────────────────────────────────────────────────
// Una sola crida per a TOT l'arbre del repo (l'API de GitHub sense token només en deixa
// 60 per hora, i demanar carpeta a carpeta se les menjava). Es desa en cau.
async function vcslWavs() {
  if (fs.existsSync(TREE_CACHE)) return JSON.parse(fs.readFileSync(TREE_CACHE, "utf8"));
  const j = await fetch(`${VCSL_API}?recursive=1`).then((r) => r.json());
  if (!j.tree) throw new Error(`GitHub no ha retornat l'arbre: ${j.message ?? "resposta inesperada"}`);
  if (j.truncated) console.log("⚠ L'arbre del repo ve truncat: pot faltar algun instrument.");
  const paths = j.tree.filter((t) => t.type === "blob" && t.path.toLowerCase().endsWith(".wav")).map((t) => t.path);
  fs.writeFileSync(TREE_CACHE, JSON.stringify(paths));
  return paths;
}
const tree = await vcslWavs();

for (const inst of VCSL) {
  // Tot el que pengi de la carpeta, encara que sigui dins de subcarpetes (Sus/, Normal/…).
  const wavs = tree.filter((p) => p.startsWith(`${inst.dir}/`));
  if (!wavs.length) { console.log(`  ⚠ ${inst.label}: cap WAV a ${inst.dir}`); continue; }
  // Mostres del mig de la llista: el registre central sona més reconeixible que els extrems.
  const picks = [];
  for (let i = 0; i < PER_INSTRUMENT; i++) {
    const idx = Math.floor(wavs.length * (0.4 + 0.15 * i)) % wavs.length;
    if (!picks.includes(wavs[idx])) picks.push(wavs[idx]);
  }
  let n = 0;
  for (const w of picks) {
    const url = `${VCSL_RAW}/${w.split("/").map(encodeURIComponent).join("/")}`;
    const res = await fetch(url, { headers: { Range: "bytes=0-1999999" } });
    const wav = fixWav(Buffer.from(await res.arrayBuffer()));
    if (!wav) continue;
    save(wav, inst.slug, ++n, {
      slug: inst.slug, label: inst.label, family: inst.family,
      license: "cc0", attribution: "Versilian Community Sample Library (VCSL) — CC0",
      source: "https://github.com/sgossner/VCSL",
    });
  }
  console.log(`  ${inst.label.padEnd(18)} ${n} clips (VCSL)`);
}

// ── TinySOL (CC BY 4.0) ────────────────────────────────────────────────────
if (ONLY_VCSL) console.log("(--vcsl: es salta TinySOL)");
const solCount = {};
const solDone = () => Object.keys(SOL).every((k) => (solCount[k] ?? 0) >= PER_INSTRUMENT);

if (!ONLY_VCSL) {
console.log("Descomprimint TinySOL en streaming (898 MB, un parell de minuts)…");
const res = await fetch(TINYSOL);
const gunzip = zlib.createGunzip();
Readable.fromWeb(res.body).pipe(gunzip);

let buf = Buffer.alloc(0);
let stop = false;
outer: for await (const chunk of gunzip) {
  buf = Buffer.concat([buf, chunk]);
  for (;;) {
    if (buf.length < 512) break;
    const name = buf.toString("utf8", 0, 100).replace(/\0.*$/, "");
    if (!name) { stop = true; break outer; }
    const size = parseInt(buf.toString("utf8", 124, 136).replace(/\0.*$/, "").trim(), 8) || 0;
    const padded = Math.ceil(size / 512) * 512;
    if (buf.length < 512 + padded) break;
    // Ruta tipus TinySOL/Strings/Violin/ordinario/Vn-ord-A4-mf-3c.wav
    const parts = name.split("/");
    const instDir = parts[2];
    const meta = SOL[instDir];
    if (meta && name.endsWith(".wav") && name.includes("/ordinario/") && (solCount[instDir] ?? 0) < PER_INSTRUMENT) {
      const wav = fixWav(Buffer.from(buf.subarray(512, 512 + size)));
      if (wav) {
        solCount[instDir] = (solCount[instDir] ?? 0) + 1;
        save(wav, meta.slug, solCount[instDir], {
          slug: meta.slug, label: meta.label, family: meta.family,
          license: "cc-by-4.0", attribution: "TinySOL, IRCAM (Cella et al.) — CC BY 4.0",
          source: "https://zenodo.org/records/3659365",
        });
      }
    }
    buf = buf.subarray(512 + padded);
    if (solDone()) { stop = true; break outer; }
  }
}
gunzip.destroy();
if (!stop) console.log("⚠ S'ha acabat l'arxiu sense omplir totes les quotes.");
for (const [dir, meta] of Object.entries(SOL)) {
  console.log(`  ${meta.label.padEnd(18)} ${solCount[dir] ?? 0} clips (TinySOL)`);
}
}

fs.rmSync(TMP, { recursive: true, force: true });
const prev = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : [];
const touched = new Set(manifest.map((m) => m.slug));
const merged = [...manifest, ...prev.filter((p) => !touched.has(p.slug))];
fs.writeFileSync(MANIFEST, JSON.stringify(merged, null, 2));
fs.writeFileSync(
  path.join(OUT_DIR, "CREDITS.md"),
  `# Crèdits dels clips d'instruments

**Teclats, percussió i instruments del món:** [Versilian Community Sample Library (VCSL)](https://github.com/sgossner/VCSL)
— **CC0 1.0** (domini públic): ús comercial lliure, sense atribució obligatòria. La posem igualment.

**Orquestra (corda, metall, vent fusta, acordió):** [TinySOL](https://zenodo.org/records/3659365),
IRCAM — **CC BY 4.0**. Cella, C. E. et al., *TinySOL: an audio dataset of isolated musical notes*.

Clips: ${manifest.length} · generat per \`prisma/download-instruments.mjs\` (${new Date().toISOString().slice(0, 10)}).
`,
);
console.log(`\nManifest: ${merged.length} clips de ${new Set(merged.map((m) => m.slug)).size} instruments.`);
