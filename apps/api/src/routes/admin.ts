import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { PrismaClient } from "@prisma/client";

// Rutes d'administració (rol 'admin'). Cua de moderació prioritzada per vots:
// l'admin resol els casos dubtosos que l'auto-triatge no ha decidit.
export function adminRoutes(app: FastifyInstance, prisma: PrismaClient) {
  const adminOnly = async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { role: true } });
    if (user?.role !== "admin") return reply.code(403).send({ error: "només admin" });
  };
  const guard = { preHandler: [app.authenticate, adminOnly] };

  // Cua de preguntes pendents, ordenada per senyal (m'agrada − no m'agrada).
  app.get("/admin/review", guard, async () => {
    const qs = await prisma.question.findMany({
      where: { status: "review" },
      orderBy: [{ likes: "desc" }, { dislikes: "asc" }],
      take: 100,
      select: {
        id: true, prompt: true, payload: true, answer: true, likes: true, dislikes: true,
        topicSlug: true, createdAt: true,
        author: { select: { displayName: true } },
      },
    });
    return qs.map((q) => ({
      id: q.id, prompt: q.prompt, options: (q.payload as any).options, correctId: (q.answer as any).correctId,
      likes: q.likes, dislikes: q.dislikes, topicSlug: q.topicSlug,
      author: q.author?.displayName ?? "—", createdAt: q.createdAt,
    }));
  });

  app.get("/admin/stats", guard, async () => {
    const byStatus = await prisma.question.groupBy({ by: ["status"], _count: true });
    const community = await prisma.question.count({ where: { source: "community" } });
    return { byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })), community };
  });

  app.post("/admin/questions/:id/publish", guard, async (req, reply) => {
    const { id } = req.params as { id: string };
    const q = await prisma.question.findUnique({ where: { id }, select: { id: true } });
    if (!q) return reply.code(404).send({ error: "not_found" });
    await prisma.question.update({ where: { id }, data: { status: "published" } });
    return { status: "published" };
  });

  app.post("/admin/questions/:id/reject", guard, async (req, reply) => {
    const { id } = req.params as { id: string };
    const q = await prisma.question.findUnique({ where: { id }, select: { id: true } });
    if (!q) return reply.code(404).send({ error: "not_found" });
    await prisma.question.update({ where: { id }, data: { status: "rejected" } });
    return { status: "rejected" };
  });
}
