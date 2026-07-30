import { PrismaClient } from "@prisma/client";

// Progressió en acabar una partida: XP, nivell, ratxa diària i assoliments bàsics.

export interface ProgressionResult {
  xpGained: number;
  xpTotal: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  dailyStreak: number;
  unlockedAchievements: string[];
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function isYesterday(prev: Date, now: Date): boolean {
  const y = new Date(now);
  y.setUTCDate(y.getUTCDate() - 1);
  return isSameDay(prev, y);
}

export async function applyMatchProgression(
  prisma: PrismaClient,
  userId: string,
  matchScore: number,
): Promise<ProgressionResult> {
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: userId } });
  const now = new Date();

  // XP: 1 punt de partida = 1 XP.
  const xpGained = matchScore;
  const xpTotal = Number(profile.xp) + xpGained;

  // Nivell: el llindar més alt assolit (taula level_thresholds).
  const threshold = await prisma.levelThreshold.findFirst({
    where: { xpNeeded: { lte: xpTotal } },
    orderBy: { level: "desc" },
  });
  const levelAfter = threshold?.level ?? 1;

  // Ratxa diària: avui ja comptat → igual; ahir → +1; si no → torna a 1.
  let dailyStreak = profile.currentStreak;
  if (!profile.lastPlayedOn) dailyStreak = 1;
  else if (isSameDay(profile.lastPlayedOn, now)) dailyStreak = Math.max(1, dailyStreak);
  else if (isYesterday(profile.lastPlayedOn, now)) dailyStreak = dailyStreak + 1;
  else dailyStreak = 1;

  await prisma.profile.update({
    where: { id: userId },
    data: {
      xp: BigInt(xpTotal),
      level: levelAfter,
      currentStreak: dailyStreak,
      longestStreak: Math.max(profile.longestStreak, dailyStreak),
      lastPlayedOn: now,
    },
  });

  // Assoliments bàsics (avaluació simple al tancar partida).
  const unlockedAchievements: string[] = [];
  const finishedMatches = await prisma.matchParticipant.count({
    where: { userId, match: { status: "finished" } },
  });
  const candidates: Array<{ slug: string; earned: boolean }> = [
    { slug: "primera-partida", earned: finishedMatches >= 1 },
    { slug: "ratxa-3-dies", earned: dailyStreak >= 3 },
    { slug: "nivell-5", earned: levelAfter >= 5 },
  ];
  for (const c of candidates) {
    if (!c.earned) continue;
    const created = await prisma.userAchievement.createMany({
      data: [{ userId, achievementSlug: c.slug }],
      skipDuplicates: true,
    });
    if (created.count > 0) unlockedAchievements.push(c.slug);
  }

  return {
    xpGained,
    xpTotal,
    levelBefore: profile.level,
    levelAfter,
    leveledUp: levelAfter > profile.level,
    dailyStreak,
    unlockedAchievements,
  };
}
