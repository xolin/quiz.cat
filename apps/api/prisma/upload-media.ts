// Puja al storage (MinIO/S3) els fitxers de mèdia que encara són locals i actualitza
// `media_assets.storage_path` amb la clau de l'objecte.
//
//   pnpm --filter @quizcat/api media:upload
//
// Idempotent: els actius amb storage_path que ja NO comença per "/" es donen per pujats.
// Els fitxers locals es conserven com a xarxa de seguretat (si el storage cau, el joc
// segueix servint el camí local del payload).
import "../src/env.js";
import { PrismaClient } from "@prisma/client";
import { ensureBucket, putObject, storageEnabled, bucketName } from "../src/services/storage.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../../web/public");
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".wav": "audio/wav",
};

const prisma = new PrismaClient();

if (!storageEnabled()) {
  console.error("Storage no configurat: omple S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY al .env i engega el MinIO (docker compose -f docker-compose.dev.yml up -d minio).");
  process.exit(1);
}

await ensureBucket();

const assets = await prisma.mediaAsset.findMany();
let uploaded = 0, already = 0, missing = 0;

for (const a of assets) {
  if (!a.storagePath.startsWith("/")) { already++; continue; }
  const local = path.join(PUBLIC_DIR, a.storagePath);
  if (!fs.existsSync(local)) {
    console.warn(`  ⚠ fitxer local absent: ${a.storagePath}`);
    missing++;
    continue;
  }
  const key = a.storagePath.replace(/^\//, ""); // "/mystery/tiger.jpg" → "mystery/tiger.jpg"
  const ext = path.extname(local).toLowerCase();
  await putObject(key, fs.readFileSync(local), CONTENT_TYPES[ext] ?? "application/octet-stream");
  await prisma.mediaAsset.update({ where: { id: a.id }, data: { storagePath: key } });
  uploaded++;
}

console.log(`Bucket "${bucketName()}": ${uploaded} pujats · ${already} ja hi eren · ${missing} sense fitxer local · ${assets.length} actius en total.`);
await prisma.$disconnect();
