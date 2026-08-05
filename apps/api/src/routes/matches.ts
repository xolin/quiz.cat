import type { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import type { QuestionTypeSlug } from "@quizcat/shared";
import { grade } from "../questionValidators/index.js";
import { scoreRound, GRACE_MS } from "../services/scoring.js";
import { selectQuestions, nextSurvivalQuestion } from "../services/selection.js";
import { applyMatchProgression } from "../services/progression.js";
import { updateSkill, skillLabel, isDifficulty, type Difficulty } from "../services/skill.js";
import { applyEnergy, ENERGY_PER_CORRECT } from "../services/energy.js";
import { estimationBaseMultiplier } from "../questionValidators/estimation.js";
import { orderingBaseMultiplier } from "../questionValidators/ordering.js";
import { withMediaUrl } from "../services/media.js";

const ROUNDS_PER_MATCH = 8;
const TIME_LIMIT_MS = 15000;

// ── Survival: rondes sense fi fins que falles ──────────────────────────────
// El temps s'escurça a mesura que avances; és el que fa que la tirada s'acabi
// encara que dominis el tema. La dificultat puja a `survivalBand()`.
const SURVIVAL_STEP_MS = 400;
// Terra de temps per mecànica: clicar una opció es pot fer en 6s, però ordenar una
// cronologia o situar un punt al mapa no — amb un terra únic, les mecàniques lentes
// es tornaven impossibles per motius d'interfície, no de coneixement.
const SLOW_TYPES = new Set(["ordering", "timeline", "map_guess", "estimation"]);
const survivalTimeLimit = (streak: number, typeSlug: string) =>
  Math.max(SLOW_TYPES.has(typeSlug) ? 10000 : 6000, TIME_LIMIT_MS - streak * SURVIVAL_STEP_MS);

function todaySeed(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function matchRoutes(app: FastifyInstance, prisma: PrismaClient) {
  /** Vista d'una ronda per al client: MAI inclou question.answer. */
  async function roundView(mode: string, round: {
    roundIndex: number;
    timeLimitMs: number;
    question: {
      id: string;
      typeSlug: string;
      prompt: string | null;
      payload: Prisma.JsonValue;
      category: { slug: string; name: string; icon: string | null } | null;
    };
  }) {
    return {
      index: round.roundIndex,
      total: mode === "survival" ? null : ROUNDS_PER_MATCH, // survival: no se sap quantes n'hi haurà
      timeLimitMs: round.timeLimitMs,
      typeSlug: round.question.typeSlug,
      prompt: round.question.prompt,
      // El mèdia viu al storage: el payload surt amb una URL temporal, no amb la ruta interna.
      payload: await withMediaUrl(prisma, round.question.payload),
      category: round.question.category
        ? { slug: round.question.category.slug, name: round.question.category.name, icon: round.question.category.icon }
        : null,
    };
  }

  async function getParticipantOr404(matchId: string, userId: string) {
    return prisma.matchParticipant.findUnique({
      where: { matchId_userId: { matchId, userId } },
      include: { match: true },
    });
  }

  /** Primera ronda del match sense resposta d'aquest participant. */
  async function currentRound(matchId: string, participantId: string) {
    const rounds = await prisma.matchRound.findMany({
      where: { matchId },
      orderBy: { roundIndex: "asc" },
      include: {
        question: { include: { category: true } },
        answers: { where: { participantId } },
      },
    });
    return rounds.find((r) => r.answers.length === 0) ?? null;
  }

  // Crea una partida (solo) o retorna/crea la diària del dia.
  app.post("/matches", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const body = (req.body ?? {}) as { mode?: "solo" | "daily" | "survival"; difficulty?: string };
    const mode = body.mode ?? "solo";
    const difficulty: Difficulty = isDifficulty(body.difficulty) ? body.difficulty : "adaptive";
    if (!["solo", "daily", "survival"].includes(mode)) return reply.code(400).send({ error: "mode invàlid" });

    // Survival: no se sap quantes rondes hi haurà, així que només es crea la primera.
    // La resta es van generant a /round segons fins on hagis arribat.
    if (mode === "survival") {
      const first = await nextSurvivalQuestion(prisma, { userId, streak: 0, usedIds: [] });
      if (!first) return reply.code(409).send({ error: "no_questions" });
      const match = await prisma.match.create({
        data: {
          gameSlug: "quiz", mode, startedAt: new Date(),
          participants: { create: { userId } },
          rounds: { create: [{ roundIndex: 0, questionId: first.id, timeLimitMs: survivalTimeLimit(0, first.typeSlug) }] },
        },
      });
      return { matchId: match.id, mode, totalRounds: null, alreadyFinished: false };
    }

    if (mode === "daily") {
      const existing = await prisma.match.findFirst({
        where: { mode: "daily", seed: todaySeed(), participants: { some: { userId } } },
        include: { participants: { where: { userId } } },
      });
      if (existing) {
        return {
          matchId: existing.id,
          mode,
          totalRounds: ROUNDS_PER_MATCH,
          alreadyFinished: existing.status === "finished",
          score: existing.participants[0]?.score ?? 0,
        };
      }
    }

    const questionIds = await selectQuestions(prisma, {
      userId,
      count: ROUNDS_PER_MATCH,
      mode,
      difficulty,
      seed: mode === "daily" ? todaySeed() : undefined,
    });

    const match = await prisma.match.create({
      data: {
        gameSlug: "quiz",
        mode,
        seed: mode === "daily" ? todaySeed() : null,
        startedAt: new Date(),
        participants: { create: { userId } },
        rounds: {
          create: questionIds.map((qid, i) => ({
            roundIndex: i,
            questionId: qid,
            timeLimitMs: TIME_LIMIT_MS,
          })),
        },
      },
    });
    return { matchId: match.id, mode, totalRounds: ROUNDS_PER_MATCH, alreadyFinished: false };
  });

  /**
   * Afegeix la ronda següent d'una tirada de survival. Es genera en el moment de servir-la
   * (no hi ha llista feta) perquè la dificultat i el temps depenen de fins on has arribat.
   * Retorna null si ja no queden preguntes: la tirada s'acaba com a perfecta.
   */
  async function appendSurvivalRound(matchId: string, participantId: string, userId: string) {
    const rounds = await prisma.matchRound.findMany({
      where: { matchId },
      orderBy: { roundIndex: "asc" },
      include: { question: { select: { typeSlug: true, categoryId: true } }, answers: { where: { participantId } } },
    });
    const streak = rounds.filter((r) => r.answers[0]?.isCorrect).length;
    const last = rounds[rounds.length - 1];
    const next = await nextSurvivalQuestion(prisma, {
      userId,
      streak,
      usedIds: rounds.map((r) => r.questionId),
      lastTypeSlug: last?.question.typeSlug,
      lastCategoryId: last?.question.categoryId,
    });
    if (!next) return null;
    const created = await prisma.matchRound.create({
      data: {
        matchId,
        roundIndex: rounds.length,
        questionId: next.id,
        timeLimitMs: survivalTimeLimit(streak, next.typeSlug),
      },
    });
    return prisma.matchRound.findUniqueOrThrow({
      where: { id: created.id },
      include: { question: { include: { category: true } }, answers: { where: { participantId } } },
    });
  }

  // Ronda actual. El rellotge del servidor arrenca la PRIMERA vegada que se serveix.
  app.get("/matches/:id/round", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const participant = await getParticipantOr404(id, req.user.sub);
    if (!participant) return reply.code(404).send({ error: "match_not_found" });
    if (participant.match.status !== "active") return { finished: true };

    let round = await currentRound(id, participant.id);
    if (!round && participant.match.mode === "survival") {
      round = await appendSurvivalRound(id, participant.id, req.user.sub);
      if (!round) {
        // Tirada perfecta: no queden preguntes per servir. Es tanca com a acabada.
        await prisma.match.update({ where: { id }, data: { status: "finished", endedAt: new Date() } });
        return { finished: true };
      }
    }
    if (!round) return { finished: true };

    if (!round.startedAt) {
      await prisma.matchRound.update({ where: { id: round.id }, data: { startedAt: new Date() } });
    }
    return { finished: false, round: await roundView(participant.match.mode, round) };
  });

  // Respon la ronda actual: el SERVIDOR corregeix, cronometra i puntua.
  app.post("/matches/:id/answer", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { given } = (req.body ?? {}) as { given?: unknown };
    const participant = await getParticipantOr404(id, req.user.sub);
    if (!participant) return reply.code(404).send({ error: "match_not_found" });
    if (participant.match.status !== "active") return reply.code(409).send({ error: "match_finished" });

    const round = await currentRound(id, participant.id);
    if (!round) return reply.code(409).send({ error: "no_pending_round" });
    if (!round.startedAt) return reply.code(409).send({ error: "round_not_served" });

    const now = new Date();
    const responseMs = now.getTime() - round.startedAt.getTime();
    const truth = round.question.answer;
    const gradedCorrect =
      given != null && grade(round.question.typeSlug as QuestionTypeSlug, given, truth);

    // Encerts consecutius previs (per al bonus de ratxa dins de partida).
    const prevAnswers = await prisma.roundAnswer.findMany({
      where: { participantId: participant.id, round: { matchId: id } },
      include: { round: { select: { roundIndex: true } } },
      orderBy: { round: { roundIndex: "asc" } },
    });
    let consecutiveBefore = 0;
    for (let i = prevAnswers.length - 1; i >= 0; i--) {
      if (prevAnswers[i].isCorrect) consecutiveBefore++;
      else break;
    }

    // Punts graduats. L'ordenació s'hi afegeix a l'estimació: encertar-ne tres de quatre no
    // és el mateix que zero de quatre, i fins ara puntuaven igual.
    const baseMultiplier =
      round.question.typeSlug === "estimation" ? estimationBaseMultiplier(given, truth as any)
      : round.question.typeSlug === "ordering" || round.question.typeSlug === "timeline"
        ? orderingBaseMultiplier(given, truth as any)
      : 1;
    const breakdown = scoreRound({
      isCorrect: gradedCorrect,
      responseMs,
      timeLimitMs: round.timeLimitMs,
      consecutiveBefore,
      baseMultiplier,
    });
    const isCorrect = gradedCorrect && !breakdown.expired;

    // Actualitza rating d'habilitat + energia (guanyada per encert; també regenera pel temps).
    const profile = await prisma.profile.findUniqueOrThrow({
      where: { id: req.user.sub },
      select: { skill: true, skillAnswers: true, energy: true, energyUpdatedAt: true },
    });
    const newSkill = updateSkill(profile.skill, round.question.difficulty, isCorrect, profile.skillAnswers);

    // Nivell de la TEMÀTICA, a part del global. Una pregunta de química és fàcil per a qui
    // en sap i molt difícil per a qui no; amb un sol rating, tots dos rebien el mateix.
    //
    // La primera resposta d'un tema arrenca del nivell GLOBAL i no d'un 2,5 arbitrari: si ja
    // sabem que juga bé, no té sentit suposar que és mitjà en tot fins que ho demostri tema
    // per tema. `effectiveTopicSkill` acaba la feina en llegir-lo, tibant cap al global
    // mentre hi hagi poques respostes.
    const topicSlug = round.question.topicSlug;
    const topicRow = topicSlug
      ? await prisma.topicSkill.findUnique({
          where: { profileId_topicSlug: { profileId: req.user.sub, topicSlug } },
          select: { skill: true, answers: true },
        })
      : null;
    const newTopicSkill = topicSlug
      ? updateSkill(topicRow?.skill ?? profile.skill, round.question.difficulty, isCorrect, topicRow?.answers ?? 0)
      : null;
    const energyState = applyEnergy(profile.energy, profile.energyUpdatedAt, now, isCorrect ? ENERGY_PER_CORRECT : 0);
    const energyGained = isCorrect ? energyState.energy - profile.energy : 0;

    await prisma.$transaction([
      ...(topicSlug && newTopicSkill !== null
        ? [
            prisma.topicSkill.upsert({
              where: { profileId_topicSlug: { profileId: req.user.sub, topicSlug } },
              update: { skill: newTopicSkill, answers: { increment: 1 }, correct: { increment: isCorrect ? 1 : 0 } },
              create: { profileId: req.user.sub, topicSlug, skill: newTopicSkill, answers: 1, correct: isCorrect ? 1 : 0 },
            }),
          ]
        : []),
      prisma.profile.update({
        where: { id: req.user.sub },
        data: {
          skill: newSkill, skillAnswers: { increment: 1 },
          energy: energyState.energy, energyUpdatedAt: energyState.anchor,
        },
      }),
      prisma.roundAnswer.create({
        data: {
          roundId: round.id,
          participantId: participant.id,
          givenAnswer: given === undefined ? Prisma.JsonNull : (given as Prisma.InputJsonValue),
          isCorrect,
          responseMs,
          pointsAwarded: breakdown.total,
        },
      }),
      prisma.matchParticipant.update({
        where: { id: participant.id },
        data: { score: { increment: breakdown.total } },
      }),
      prisma.questionStats.upsert({
        where: { questionId: round.questionId },
        update: {
          timesServed: { increment: 1 },
          timesCorrect: { increment: isCorrect ? 1 : 0 },
        },
        create: {
          questionId: round.questionId,
          timesServed: 1,
          timesCorrect: isCorrect ? 1 : 0,
        },
      }),
      prisma.userQuestionHistory.upsert({
        where: { userId_questionId: { userId: req.user.sub, questionId: round.questionId } },
        update: { lastSeenAt: now, seenCount: { increment: 1 } },
        create: { userId: req.user.sub, questionId: round.questionId },
      }),
    ]);

    const newScore = participant.score + breakdown.total;
    const survival = participant.match.mode === "survival";
    // Survival: la tirada s'acaba al primer error (o quan s'esgota el temps).
    const isLast = survival ? !isCorrect : round.roundIndex === ROUNDS_PER_MATCH - 1;
    const streak = survival ? consecutiveBefore + (isCorrect ? 1 : 0) : null;

    let progression = null;
    if (isLast) {
      await prisma.match.update({
        where: { id },
        data: { status: "finished", endedAt: now },
      });
      progression = await applyMatchProgression(prisma, req.user.sub, newScore);
    }

    return {
      isCorrect,
      expired: breakdown.expired,
      questionId: round.questionId, // per poder valorar la pregunta (👍/👎) després de respondre
      // Feedback pedagògic: un cop respost, revelem la veritat d'aquesta pregunta.
      correctAnswer: truth,
      points: breakdown,
      score: newScore,
      finished: isLast,
      streak, // survival: rondes superades fins ara (null en la resta de modes)
      progression,
      skill: { before: profile.skill, after: newSkill, label: skillLabel(newSkill) },
      energy: { value: energyState.energy, gained: Math.max(0, energyGained) },
    };
  });

  app.post("/matches/:id/abandon", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const participant = await getParticipantOr404(id, req.user.sub);
    if (!participant) return reply.code(404).send({ error: "match_not_found" });
    if (participant.match.status === "active") {
      await prisma.match.update({ where: { id }, data: { status: "abandoned", endedAt: new Date() } });
    }
    return { ok: true };
  });

  // Resum final: rondes, encerts i punts.
  app.get("/matches/:id/summary", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const participant = await getParticipantOr404(id, req.user.sub);
    if (!participant) return reply.code(404).send({ error: "match_not_found" });

    const rounds = await prisma.matchRound.findMany({
      where: { matchId: id },
      orderBy: { roundIndex: "asc" },
      include: {
        question: { select: { prompt: true, typeSlug: true } },
        answers: { where: { participantId: participant.id } },
      },
    });
    const detail = rounds.map((r) => ({
      index: r.roundIndex,
      questionId: r.questionId, // per valorar la pregunta (👍/👎) des del resum, amb calma
      prompt: r.question.prompt,
      typeSlug: r.question.typeSlug,
      isCorrect: r.answers[0]?.isCorrect ?? null,
      points: r.answers[0]?.pointsAwarded ?? 0,
      responseMs: r.answers[0]?.responseMs ?? null,
    }));
    return {
      status: participant.match.status,
      mode: participant.match.mode,
      score: participant.score,
      correct: detail.filter((d) => d.isCorrect).length,
      total: rounds.length,
      // Al survival la xifra que importa és fins on has arribat, no el percentatge d'encerts.
      streak: participant.match.mode === "survival" ? detail.filter((d) => d.isCorrect).length : null,
      rounds: detail,
    };
  });
}

export { GRACE_MS };
