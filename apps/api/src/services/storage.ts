// Storage S3-compatible (MinIO en dev, qualsevol S3 en producció) per als fitxers de mèdia.
// Si no hi ha configuració, el mòdul queda DESACTIVAT i el joc segueix funcionant amb els
// fitxers locals de `web/public` — així el dev no depèn de tenir el MinIO engegat.
import { Client } from "minio";

const URL_TTL_S = 60 * 60; // 1 h: les partides duren minuts, no cal més

// Es llegeix a la crida, no en carregar el mòdul: així no depèn de l'ordre d'imports.
const bucket = () => process.env.S3_BUCKET ?? "quizcat-media";

let client: Client | null | undefined; // undefined = encara no provat

function storage(): Client | null {
  if (client !== undefined) return client;
  const endpoint = process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;
  if (!endpoint || !accessKey || !secretKey) {
    client = null;
    return null;
  }
  const url = new URL(endpoint);
  client = new Client({
    endPoint: url.hostname,
    port: Number(url.port) || (url.protocol === "https:" ? 443 : 80),
    useSSL: url.protocol === "https:",
    accessKey,
    secretKey,
  });
  return client;
}

export const storageEnabled = () => storage() !== null;
export const bucketName = bucket;

/** Assegura que el bucket existeix (l'usen els scripts de pujada). */
export async function ensureBucket(): Promise<void> {
  const s = storage();
  if (!s) throw new Error("Storage no configurat (falten S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY)");
  if (!(await s.bucketExists(bucket()))) await s.makeBucket(bucket());
}

/** URL temporal de lectura d'un objecte. `null` si el storage no està configurat. */
export async function signedUrl(objectKey: string): Promise<string | null> {
  const s = storage();
  if (!s || !objectKey) return null;
  try {
    return await s.presignedGetObject(bucket(), objectKey, URL_TTL_S);
  } catch {
    return null; // objecte inexistent o storage caigut: es fa servir el camí local
  }
}

export async function putObject(objectKey: string, body: Buffer, contentType: string): Promise<void> {
  const s = storage();
  if (!s) throw new Error("Storage no configurat");
  await s.putObject(bucket(), objectKey, body, body.length, { "Content-Type": contentType });
}
