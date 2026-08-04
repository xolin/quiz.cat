import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { TOPIC_CHILDREN } from "../services/selection.js";
import { effectiveTopicSkill, skillLabel } from "../services/skill.js";

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
    // El recompte d'un bloc gros ha d'incloure els seus fills, que és el que rep qui el tria
    // (veure `TOPIC_CHILDREN`). Sense això, «Cultura» surt amb 22 preguntes —les que no
    // encaixen a cap fill— quan de fet n'hi donen prop de dues mil i mitja.
    const countOf = (slug: string) =>
      (countBy.get(slug) ?? 0) + (TOPIC_CHILDREN[slug] ?? []).reduce((sum, c) => sum + (countBy.get(c) ?? 0), 0);
    return {
      region: profile.region,
      selected: profile.topics,
      topics: topics.map((t) => ({
        slug: t.slug, name: t.name, icon: t.icon, kind: t.kind,
        questionCount: countOf(t.slug),
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

  /**
   * Perfil de coneixement per temàtica: la base del gràfic de radar.
   *
   * Torna TOTES les temàtiques amb el nivell efectiu i quantes n'has respost, i deixa que
   * la interfície decideixi quines dibuixa. Un radar amb vint puntes on no has jugat mai
   * no diu res de tu, diu que no has jugat — per això va `answers` a cada una.
   *
   * Nota de producte (decisions.md): quan es dibuixi, ha d'anar en un lloc DISCRET. Hi ha
   * gent que es pot sentir avaluada, i el joc no vol ser un examen.
   */
  app.get("/me/radar", { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const [profile, skills, topics] = await Promise.all([
      prisma.profile.findUniqueOrThrow({ where: { id: userId }, select: { skill: true } }),
      prisma.topicSkill.findMany({
        where: { profileId: userId },
        select: { topicSlug: true, skill: true, answers: true, correct: true },
      }),
      prisma.topic.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, icon: true, kind: true } }),
    ]);
    const byTopic = new Map(skills.map((s) => [s.topicSlug, s]));
    return {
      skill: profile.skill,
      label: skillLabel(profile.skill),
      topics: topics.map((t) => {
        const s = byTopic.get(t.slug);
        return {
          slug: t.slug,
          name: t.name,
          icon: t.icon,
          kind: t.kind,
          // Tibat cap al nivell global mentre hi hagi poques respostes: sense això, encertar
          // les dues úniques preguntes de música que has vist et faria semblar musicòleg.
          skill: Math.round(effectiveTopicSkill(profile.skill, s) * 100) / 100,
          answers: s?.answers ?? 0,
          correct: s?.correct ?? 0,
        };
      }),
    };
  });

  app.put("/me/region", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { region } = (req.body ?? {}) as { region?: string };
    if (region != null && !ALLOWED_REGIONS.includes(region)) return reply.code(400).send({ error: "regió invàlida" });
    await prisma.profile.update({ where: { id: req.user.sub }, data: { region: region ?? null } });
    return { region: region ?? null };
  });
}
