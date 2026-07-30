import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

const ALLOWED_REGIONS = ["catalunya", "espanya", "mon"];

// Temàtiques seleccionables. Es SUGGEREIXEN segons la regió de l'usuari (deduïda o triada);
// l'usuari s'hi pot centrar (filtre a la selecció de preguntes de la partida ràpida).
export function topicRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/topics", { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const [topics, profile, counts] = await Promise.all([
      prisma.topic.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.profile.findUniqueOrThrow({ where: { id: userId }, select: { region: true, topics: true } }),
      prisma.question.groupBy({ by: ["topicSlug"], where: { status: "published", premiumPack: null }, _count: true }),
    ]);
    const countBy = new Map(counts.map((c) => [c.topicSlug, c._count]));
    const selected = new Set(profile.topics);
    return {
      region: profile.region,
      selected: profile.topics,
      topics: topics.map((t) => ({
        slug: t.slug, name: t.name, icon: t.icon, kind: t.kind,
        questionCount: countBy.get(t.slug) ?? 0,
        suggested: t.regions.length > 0 && profile.region != null && t.regions.includes(profile.region),
        selected: selected.has(t.slug),
      })),
    };
  });

  app.put("/me/topics", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { topics } = (req.body ?? {}) as { topics?: string[] };
    if (!Array.isArray(topics)) return reply.code(400).send({ error: "topics ha de ser una llista" });
    const valid = await prisma.topic.findMany({ where: { slug: { in: topics } }, select: { slug: true } });
    const validSlugs = valid.map((v) => v.slug);
    await prisma.profile.update({ where: { id: req.user.sub }, data: { topics: validSlugs } });
    return { topics: validSlugs };
  });

  app.put("/me/region", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { region } = (req.body ?? {}) as { region?: string };
    if (region != null && !ALLOWED_REGIONS.includes(region)) return reply.code(400).send({ error: "regió invàlida" });
    await prisma.profile.update({ where: { id: req.user.sub }, data: { region: region ?? null } });
    return { region: region ?? null };
  });
}
