// Engega tot el projecte en local amb un sol comando: `pnpm dev`.
//
// Fa, per ordre: .env → Docker (Postgres + MinIO) → client de Prisma → migracions →
// seed → pujada de mèdia al MinIO → API i web alhora. Tot és idempotent, o sigui que
// també serveix per al dia a dia, no només per a la primera vegada.
//
//   pnpm dev            engegada completa
//   pnpm dev --rapid    salta seed i pujada de mèdia (arrencada de segons)
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMPOSE = ["compose", "-f", "docker-compose.dev.yml"];
const RAPID = process.argv.includes("--rapid");

const c = { dim: "\x1b[2m", red: "\x1b[31m", green: "\x1b[32m", blue: "\x1b[34m", magenta: "\x1b[35m", off: "\x1b[0m" };
const step = (msg) => console.log(`${c.blue}▸${c.off} ${msg}`);
const warn = (msg) => console.log(`${c.red}⚠${c.off} ${msg}`);

function run(cmd, args, { fatal = true, quiet = false } = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: quiet ? "pipe" : "inherit", encoding: "utf8" });
  if (r.status !== 0 && fatal) {
    warn(`ha fallat: ${cmd} ${args.join(" ")}`);
    if (quiet && r.stderr) console.error(r.stderr.trim());
    process.exit(1);
  }
  return r;
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/** Espera que un servei respongui; retorna false si s'acaba el temps. */
async function waitFor(label, check, seconds = 60) {
  process.stdout.write(`${c.dim}  esperant ${label}…${c.off}`);
  for (let i = 0; i < seconds; i++) {
    if (await check()) {
      console.log(` ${c.green}llest${c.off}`);
      return true;
    }
    await sleep(1000);
  }
  console.log(` ${c.red}temps esgotat${c.off}`);
  return false;
}

/** Hi ha res escoltant en aquest port? */
const portBusy = (port) =>
  new Promise((res) => {
    const s = net.createServer();
    s.once("error", (e) => res(e.code === "EADDRINUSE"));
    s.once("listening", () => s.close(() => res(false)));
    s.listen(port, "0.0.0.0");
  });

// ── 0) Ports lliures ───────────────────────────────────────────────────────
// Si no es mira abans, l'API peta amb un EADDRINUSE enterrat dins d'un log JSON
// i costa d'entendre que el que passa és que ja tens un `pnpm dev` obert.
for (const [port, who] of [[4400, "l'API"], [5273, "el web"]]) {
  if (await portBusy(port)) {
    warn(`El port ${port} (${who}) ja està ocupat: pot ser un altre \`pnpm dev\` obert en un altre terminal.`);
    warn(`Mira qui és amb:  lsof -nP -iTCP:${port} -sTCP:LISTEN`);
    process.exit(1);
  }
}

// ── 1) .env ────────────────────────────────────────────────────────────────
const envPath = path.join(ROOT, "apps/api/.env");
if (!fs.existsSync(envPath)) {
  fs.copyFileSync(path.join(ROOT, ".env.example"), envPath);
  step("apps/api/.env creat a partir de .env.example");
}

// ── 2) Docker ──────────────────────────────────────────────────────────────
if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) {
  warn("El Docker no respon. Engega el Docker Desktop i torna-ho a provar.");
  process.exit(1);
}
step("Aixecant Postgres i MinIO…");
run("docker", [...COMPOSE, "up", "-d"], { quiet: true });

const pgReady = () =>
  spawnSync("docker", [...COMPOSE, "exec", "-T", "db", "pg_isready", "-U", "quizcat", "-d", "quizcat"],
    { cwd: ROOT, stdio: "ignore" }).status === 0;
if (!(await waitFor("Postgres", async () => pgReady()))) process.exit(1);

const minioUp = await waitFor("MinIO", async () => {
  try {
    return (await fetch("http://localhost:9010/minio/health/live")).ok;
  } catch {
    return false;
  }
}, 30);
if (!minioUp) warn("MinIO no respon: el joc tirarà amb els fitxers locals de web/public.");

// ── 3) Base de dades ───────────────────────────────────────────────────────
step("Client de Prisma i migracions…");
run("pnpm", ["--filter", "@quizcat/api", "exec", "prisma", "generate"], { quiet: true });
run("pnpm", ["--filter", "@quizcat/api", "exec", "prisma", "migrate", "deploy"], { quiet: true });

if (!RAPID) {
  step("Seed de continguts (idempotent)…");
  run("pnpm", ["--filter", "@quizcat/api", "seed"]);
  if (minioUp) {
    step("Pujant mèdia que encara sigui local al MinIO…");
    // Que no bloquegi l'arrencada: sense mèdia al bucket el joc funciona igual.
    run("pnpm", ["--filter", "@quizcat/api", "media:upload"], { fatal: false, quiet: true });
  }
}

// ── 4) Servidors ───────────────────────────────────────────────────────────
console.log(`
${c.green}Tot a punt.${c.off}
  Web      ${c.blue}http://localhost:5273${c.off}
  API      http://localhost:4400/health
  MinIO    http://localhost:9011  ${c.dim}(quizcat / quizcat-dev-2026)${c.off}
  ${c.dim}Ctrl+C per aturar-ho tot. Els contenidors segueixen engegats: pnpm services:down${c.off}
`);

const children = [];
function serve(name, filter, color) {
  const child = spawn("pnpm", ["--filter", filter, "dev"], { cwd: ROOT });
  const prefix = `${color}[${name}]${c.off} `;
  const pipe = (stream, out) =>
    stream.on("data", (d) =>
      String(d).split("\n").filter((l) => l.trim()).forEach((l) => out.write(prefix + l + "\n")));
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on("exit", (code) => {
    if (!stopping) {
      warn(`${name} s'ha aturat (codi ${code}); aturo la resta.`);
      stop();
    }
  });
  children.push(child);
}

let stopping = false;
function stop() {
  stopping = true;
  children.forEach((ch) => ch.kill("SIGTERM"));
  setTimeout(() => process.exit(0), 300);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

serve("api", "@quizcat/api", c.magenta);
serve("web", "@quizcat/web", c.blue);
