import type { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { triage } from "../services/moderation.js";

// Contingut de la comunitat: proposar preguntes i votar-les (👍/👎).
// El consens de vots decideix automàticament els casos clars; la resta va a l'admin.

const TOPIC_TO_CATEGORY: Record<string, string> = {
  mon: "geografia", historia: "historia", ciencia: "ciencia",
  cultura: "cultura", catalunya: "geografia", espanya: "geografia",
};

export function communityRoutes(app: FastifyInstance, prisma: PrismaClient) {
  // Proposa una pregunta (opció múltiple). Entra en estat 'review'.
  app.post("/questions/submit", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const { prompt, options, correctIndex, topicSlug } = (req.body ?? {}) as {
      prompt?: string; options?: string[]; correctIndex?: number; topicSlug?: string;
    };
    const opts = (options ?? []).map((o) => (o ?? "").trim()).filter((o) => o.length > 0);
    if (!prompt || prompt.trim().length < 8) return reply.code(400).send({ error: "enunciat massa curt (mín. 8)" });
    if (opts.length < 2 || opts.length > 4) return reply.code(400).send({ error: "cal entre 2 i 4 respostes" });
    if (typeof correctIndex !== "number" || correctIndex < 0 || correctIndex >= opts.length)
      return reply.code(400).send({ error: "resposta correcta invàlida" });
    if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length)
      return reply.code(400).send({ error: "hi ha respostes repetides" });

    const topic = topicSlug && TOPIC_TO_CATEGORY[topicSlug] ? topicSlug : "mon";
    const category = await prisma.category.findUnique({ where: { slug: TOPIC_TO_CATEGORY[topic] } });
    const payloadOptions = opts.map((text, i) => ({ id: String.fromCharCode(97 + i), text }));
    const correctId = payloadOptions[correctIndex].id;

    const q = await prisma.question.create({
      data: {
        typeSlug: "multiple_choice", categoryId: category?.id ?? null, locale: "ca",
        prompt: prompt.trim(), payload: { options: payloadOptions }, answer: { correctId },
        difficulty: 3, status: "review", source: "community", authorId: userId,
        topicSlug: topic, tags: ["community"],
      },
    });
    return { id: q.id, status: q.status };
  });

  // Vota una pregunta: 1 = 👍, -1 = 👎, 0 = treu el vot.
  app.post("/questions/:id/vote", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const { id } = req.params as { id: string };
    const { vote } = (req.body ?? {}) as { vote?: number };
    if (![1, -1, 0].includes(vote as number)) return reply.code(400).send({ error: "vot invàlid" });

    const q = await prisma.question.findUnique({ where: { id }, select: { id: true, status: true, authorId: true } });
    if (!q) return reply.code(404).send({ error: "not_found" });
    if (q.authorId === userId) return reply.code(400).send({ error: "no pots votar la teva pregunta" });

    if (vote === 0) {
      await prisma.questionVote.deleteMany({ where: { userId, questionId: id } });
    } else {
      await prisma.questionVote.upsert({
        where: { userId_questionId: { userId, questionId: id } },
        update: { vote: vote as number },
        create: { userId, questionId: id, vote: vote as number },
      });
    }

    const agg = await prisma.questionVote.groupBy({ by: ["vote"], where: { questionId: id }, _count: true });
    const likes = agg.find((a) => a.vote === 1)?._count ?? 0;
    const dislikes = agg.find((a) => a.vote === -1)?._count ?? 0;
    const data: Prisma.QuestionUpdateInput = { likes, dislikes };
    let outcome: string | null = null;
    if (q.status === "review") {
      const t = triage(likes, dislikes);
      if (t === "publish") { data.status = "published"; outcome = "published"; }
      else if (t === "reject") { data.status = "rejected"; outcome = "rejected"; }
    }
    await prisma.question.update({ where: { id }, data });
    return { likes, dislikes, yourVote: vote, outcome };
  });

  // Cua de revisió de la comunitat: preguntes pendents que l'usuari no ha proposat ni votat.
  app.get("/questions/review", { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const voted = await prisma.questionVote.findMany({ where: { userId }, select: { questionId: true } });
    const votedIds = voted.map((v) => v.questionId);
    const qs = await prisma.question.findMany({
      where: { status: "review", authorId: { not: userId }, id: { notIn: votedIds } },
      orderBy: { createdAt: "asc" }, take: 10,
      select: {
        id: true, prompt: true, payload: true, answer: true, likes: true, dislikes: true,
        topicSlug: true, category: { select: { name: true, icon: true } },
      },
    });
    return qs.map((q) => ({
      id: q.id, prompt: q.prompt,
      options: (q.payload as any).options,
      correctId: (q.answer as any).correctId, // als revisors sí que se'ls revela (jutgen la correcció)
      likes: q.likes, dislikes: q.dislikes, topicSlug: q.topicSlug,
      category: q.category,
    }));
  });

  // Les meves preguntes proposades i el seu estat (participació).
  app.get("/questions/mine", { preHandler: [app.authenticate] }, async (req) => {
    const mine = await prisma.question.findMany({
      where: { authorId: req.user.sub },
      orderBy: { createdAt: "desc" },
      select: { id: true, prompt: true, status: true, likes: true, dislikes: true },
    });
    return mine;
  });
}
