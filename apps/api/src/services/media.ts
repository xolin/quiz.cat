import type { PrismaClient, Prisma } from "@prisma/client";
import { signedUrl, storageEnabled } from "./storage.js";

/**
 * Afegeix al payload la URL temporal del fitxer de mèdia (imatge/àudio) que hi ha al storage.
 * Si el storage no està configurat —o l'actiu encara no s'hi ha pujat— deixa el payload tal
 * qual i el client segueix fent servir el camí local de `web/public`.
 *
 * Convenció: `storagePath` que comença per "/" = fitxer local encara no pujat.
 */
export async function withMediaUrl(prisma: PrismaClient, payload: Prisma.JsonValue): Promise<Prisma.JsonValue> {
  if (!storageEnabled() || !payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const mediaId = (payload as Record<string, unknown>).mediaId;
  if (typeof mediaId !== "string") return payload;

  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    select: { kind: true, storagePath: true },
  });
  if (!asset || asset.storagePath.startsWith("/")) return payload;

  const url = await signedUrl(asset.storagePath);
  if (!url) return payload;
  const withUrl: Prisma.JsonObject = {
    ...(payload as Prisma.JsonObject),
    [asset.kind === "audio" ? "audioUrl" : "imageUrl"]: url,
  };
  return withUrl;
}
