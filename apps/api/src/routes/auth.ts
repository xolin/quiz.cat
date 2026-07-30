import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { skillLabel } from "../services/skill.js";
import { syncEnergy, MINIGAME_COST } from "../services/energy.js";

export function authRoutes(app: FastifyInstance, prisma: PrismaClient) {
  async function createUserWithProfile(email: string, passwordHash: string | null, displayName: string) {
    return prisma.user.create({
      data: { email, passwordHash, profile: { create: { displayName } } },
    });
  }

  app.post("/auth/register", async (req, reply) => {
    const { email, password, displayName } = (req.body ?? {}) as {
      email?: string;
      password?: string;
      displayName?: string;
    };
    if (!email || !password || password.length < 6) {
      return reply.code(400).send({ error: "email i contrasenya (mín. 6) obligatoris" });
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return reply.code(409).send({ error: "email ja registrat" });
    const user = await createUserWithProfile(email, await bcrypt.hash(password, 10), displayName ?? email.split("@")[0]);
    return { token: app.jwt.sign({ sub: user.id }) };
  });

  app.post("/auth/login", async (req, reply) => {
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
    if (!email || !password) return reply.code(400).send({ error: "email i contrasenya obligatoris" });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.code(401).send({ error: "credencials incorrectes" });
    }
    return { token: app.jwt.sign({ sub: user.id }) };
  });

  // Joc sense fricció: crea un compte convidat i entra directament.
  app.post("/auth/guest", async (req) => {
    const { displayName } = (req.body ?? {}) as { displayName?: string };
    const id = crypto.randomUUID().slice(0, 8);
    const user = await createUserWithProfile(`guest-${id}@guest.local`, null, displayName || `Convidat-${id}`);
    return { token: app.jwt.sign({ sub: user.id }) };
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const energy = await syncEnergy(prisma, userId);
    const [profile, user] = await Promise.all([
      prisma.profile.findUniqueOrThrow({ where: { id: userId } }),
      prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } }),
    ]);
    const next = await prisma.levelThreshold.findUnique({ where: { level: profile.level + 1 } });
    const [matchesPlayed, answers] = await Promise.all([
      prisma.matchParticipant.count({ where: { userId, match: { status: "finished" } } }),
      prisma.roundAnswer.groupBy({
        by: ["isCorrect"],
        where: { participant: { userId } },
        _count: true,
      }),
    ]);
    const correct = answers.find((a) => a.isCorrect === true)?._count ?? 0;
    const total = answers.reduce((s, a) => s + a._count, 0);
    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
    });
    return {
      displayName: profile.displayName,
      xp: Number(profile.xp),
      level: profile.level,
      nextLevelXp: next ? Number(next.xpNeeded) : null,
      skill: profile.skill,
      skillLabel: skillLabel(profile.skill),
      energy: energy.energy,
      energyMax: energy.max,
      energyMsToNext: energy.msToNext,
      credits: profile.credits,
      minigameCost: MINIGAME_COST,
      region: profile.region,
      topics: profile.topics,
      role: user.role,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      matchesPlayed,
      accuracy: total > 0 ? Math.round((100 * correct) / total) : null,
      achievements: achievements.map((a) => ({
        slug: a.achievementSlug,
        name: a.achievement.name,
        icon: a.achievement.icon,
        unlockedAt: a.unlockedAt,
      })),
    };
  });
}
