import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

// Rànquings calculats en viu (a producció, la vista materialitzada leaderboard_global).
export function leaderboardRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/leaderboard", { preHandler: [app.authenticate] }, async (req) => {
    const { scope = "global" } = (req.query ?? {}) as { scope?: "global" | "daily" | "survival" };

    // Survival: no es puntua per punts acumulats sinó per la MILLOR tirada de cadascú.
    // Cal comptar encerts per tirada i quedar-se amb el màxim per usuari; amb groupBy de
    // Prisma no es pot fer en una passada, així que va en SQL.
    if (scope === "survival") {
      const rows = await prisma.$queryRaw<Array<{ user_id: string; best: bigint }>>`
        SELECT p.user_id, MAX(c.correct) AS best
        FROM (
          SELECT ra.participant_id, COUNT(*) FILTER (WHERE ra.is_correct) AS correct
          FROM round_answers ra
          JOIN match_rounds mr ON mr.id = ra.round_id
          JOIN matches m ON m.id = mr.match_id
          WHERE m.mode = 'survival'
          GROUP BY ra.participant_id
        ) c
        JOIN match_participants p ON p.id = c.participant_id
        GROUP BY p.user_id
        ORDER BY best DESC
      `;
      const profiles = await prisma.profile.findMany({
        where: { id: { in: rows.map((r) => r.user_id) } },
        select: { id: true, displayName: true, level: true },
      });
      const byId = new Map(profiles.map((p) => [p.id, p]));
      const all = rows.map((r, i) => ({
        rank: i + 1,
        userId: r.user_id,
        displayName: byId.get(r.user_id)?.displayName ?? "—",
        level: byId.get(r.user_id)?.level ?? 1,
        score: Number(r.best), // aquí "score" és la ratxa màxima
        you: r.user_id === req.user.sub,
      }));
      const top = all.slice(0, 20);
      return { scope, top, you: top.find((t) => t.you) ?? all.find((t) => t.you) ?? null };
    }

    const matchFilter =
      scope === "daily"
        ? { status: "finished", mode: "daily", seed: new Date().toISOString().slice(0, 10) }
        : { status: "finished" };

    const grouped = await prisma.matchParticipant.groupBy({
      by: ["userId"],
      where: { match: matchFilter },
      _sum: { score: true },
      orderBy: { _sum: { score: "desc" } },
      take: 20,
    });
    const profiles = await prisma.profile.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, displayName: true, level: true },
    });
    const byId = new Map(profiles.map((p) => [p.id, p]));
    const top = grouped.map((g, i) => ({
      rank: i + 1,
      userId: g.userId,
      displayName: byId.get(g.userId)?.displayName ?? "—",
      level: byId.get(g.userId)?.level ?? 1,
      score: g._sum.score ?? 0,
      you: g.userId === req.user.sub,
    }));

    // Posició pròpia si no és al top 20.
    let you = top.find((t) => t.you) ?? null;
    if (!you) {
      const all = await prisma.matchParticipant.groupBy({
        by: ["userId"],
        where: { match: matchFilter },
        _sum: { score: true },
        orderBy: { _sum: { score: "desc" } },
      });
      const idx = all.findIndex((g) => g.userId === req.user.sub);
      if (idx >= 0) {
        you = {
          rank: idx + 1,
          userId: req.user.sub,
          displayName: "tu",
          level: 0,
          score: all[idx]._sum.score ?? 0,
          you: true,
        };
      }
    }
    return { scope, top, you };
  });
}
