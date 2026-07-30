import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

// Contingut premium: packs de preguntes que es desbloquegen amb crèdits (guanyats als mini-jocs)
// o —futur— comprats amb diners (Stripe). Monetització de l'app.
export function premiumRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/premium", { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const [packs, owned, profile, counts] = await Promise.all([
      prisma.premiumPack.findMany({ orderBy: { priceCredits: "asc" } }),
      prisma.userUnlock.findMany({ where: { userId }, select: { packSlug: true } }),
      prisma.profile.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } }),
      prisma.question.groupBy({ by: ["premiumPack"], where: { status: "published", premiumPack: { not: null } }, _count: true }),
    ]);
    const ownedSet = new Set(owned.map((o) => o.packSlug));
    const countBy = new Map(counts.map((c) => [c.premiumPack, c._count]));
    return {
      credits: profile.credits,
      packs: packs.map((p) => ({
        slug: p.slug, name: p.name, description: p.description, icon: p.icon,
        priceCredits: p.priceCredits, questionCount: countBy.get(p.slug) ?? 0,
        owned: ownedSet.has(p.slug), affordable: profile.credits >= p.priceCredits,
      })),
    };
  });

  app.post("/premium/:slug/unlock", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const { slug } = req.params as { slug: string };
    const pack = await prisma.premiumPack.findUnique({ where: { slug } });
    if (!pack) return reply.code(404).send({ error: "pack_no_existeix" });
    const already = await prisma.userUnlock.findUnique({ where: { userId_packSlug: { userId, packSlug: slug } } });
    if (already) return reply.code(409).send({ error: "ja_desbloquejat" });
    const profile = await prisma.profile.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } });
    if (profile.credits < pack.priceCredits) {
      return reply.code(402).send({ error: "credits_insuficients", credits: profile.credits, price: pack.priceCredits });
    }
    await prisma.$transaction([
      prisma.profile.update({ where: { id: userId }, data: { credits: { decrement: pack.priceCredits } } }),
      prisma.userUnlock.create({ data: { userId, packSlug: slug } }),
    ]);
    return { owned: true, credits: profile.credits - pack.priceCredits };
  });
}
