import type { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { applyEnergy, syncEnergy, MINIGAME_COST } from "../services/energy.js";
import { buildDeck, creditsFor, MEMORY_PAIRS } from "../services/minigame.js";

function flagEmoji(cc: string): string {
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

export function minigameRoutes(app: FastifyInstance, prisma: PrismaClient) {
  // Inicia el mini-joc memory: gasta energia (barra plena) i crea el deck (server-only).
  app.post("/minigame/memory", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const now = new Date();
    const { energy } = await syncEnergy(prisma, userId, now);
    if (energy < MINIGAME_COST) {
      return reply.code(400).send({ error: "energia_insuficient", energy, needed: MINIGAME_COST });
    }

    const items = await prisma.datasetItem.findMany({
      where: { datasetSlug: "countries" },
      select: { label: true, attributes: true },
    });
    const deckItems = items
      .map((i) => ({ value: flagEmoji((i.attributes as any).cc ?? ""), label: i.label }))
      .filter((i) => i.value.length > 0);
    const deck = buildDeck(deckItems, MEMORY_PAIRS);

    // Gasta l'energia.
    const prof = await prisma.profile.findUniqueOrThrow({ where: { id: userId }, select: { energy: true, energyUpdatedAt: true } });
    const spent = applyEnergy(prof.energy, prof.energyUpdatedAt, now, -MINIGAME_COST);
    await prisma.profile.update({ where: { id: userId }, data: { energy: spent.energy, energyUpdatedAt: spent.anchor } });

    const session = await prisma.minigameSession.create({
      data: {
        userId, kind: "memory",
        deck: deck.values, labels: deck.labels,
        matchedIndices: [], pairs: MEMORY_PAIRS, energySpent: MINIGAME_COST, startedAt: now,
      },
    });
    return { sessionId: session.id, cards: deck.values.length, pairs: MEMORY_PAIRS, energy: spent.energy };
  });

  async function loadOwn(sessionId: string, userId: string) {
    const s = await prisma.minigameSession.findUnique({ where: { id: sessionId } });
    if (!s || s.userId !== userId) return null;
    return s;
  }

  // Estat públic (per resumir): quines cartes estan aparellades i el torn pendent. Mai els valors amagats.
  app.get("/minigame/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const s = await loadOwn((req.params as any).id, req.user.sub);
    if (!s) return reply.code(404).send({ error: "not_found" });
    const deck = s.deck as string[];
    return {
      cards: deck.length, pairs: s.pairs, moves: s.moves, status: s.status,
      matched: s.matchedIndices,
      firstFlip: s.firstFlip != null ? { index: s.firstFlip, value: deck[s.firstFlip] } : null,
      creditsAwarded: s.creditsAwarded,
    };
  });

  // Gira una carta. El servidor revela el seu valor i porta la lògica del torn.
  app.post("/minigame/:id/flip", { preHandler: [app.authenticate] }, async (req, reply) => {
    const s = await loadOwn((req.params as any).id, req.user.sub);
    if (!s) return reply.code(404).send({ error: "not_found" });
    if (s.status !== "active") return reply.code(409).send({ error: "not_active" });
    const { index } = (req.body ?? {}) as { index?: number };
    const deck = s.deck as string[];
    if (typeof index !== "number" || index < 0 || index >= deck.length) return reply.code(400).send({ error: "index_invalid" });
    if (s.matchedIndices.includes(index) || s.firstFlip === index) return reply.code(400).send({ error: "carta_no_valida" });

    const value = deck[index];

    // Primera carta del torn.
    if (s.firstFlip == null) {
      await prisma.minigameSession.update({ where: { id: s.id }, data: { firstFlip: index } });
      return { index, value, awaiting: true };
    }

    // Segona carta: resol el torn.
    const firstIndex = s.firstFlip;
    const firstValue = deck[firstIndex];
    const isMatch = firstValue === value;
    const moves = s.moves + 1;

    if (isMatch) {
      const matched = [...s.matchedIndices, firstIndex, index];
      const done = matched.length === deck.length;
      let credits = 0;
      if (done) {
        credits = creditsFor(s.pairs, moves, Date.now() - s.startedAt.getTime());
      }
      await prisma.$transaction([
        prisma.minigameSession.update({
          where: { id: s.id },
          data: {
            matchedIndices: matched, firstFlip: null, moves,
            status: done ? "won" : "active", creditsAwarded: credits, endedAt: done ? new Date() : null,
          },
        }),
        ...(done ? [prisma.profile.update({ where: { id: req.user.sub }, data: { credits: { increment: credits } } })] : []),
      ]);
      const profile = done ? await prisma.profile.findUniqueOrThrow({ where: { id: req.user.sub }, select: { credits: true } }) : null;
      return { index, value, firstIndex, firstValue, match: true, matched, moves, done, credits, totalCredits: profile?.credits };
    }

    await prisma.minigameSession.update({ where: { id: s.id }, data: { firstFlip: null, moves } });
    return { index, value, firstIndex, firstValue, match: false, moves };
  });

  app.post("/minigame/:id/abandon", { preHandler: [app.authenticate] }, async (req, reply) => {
    const s = await loadOwn((req.params as any).id, req.user.sub);
    if (!s) return reply.code(404).send({ error: "not_found" });
    if (s.status === "active") {
      await prisma.minigameSession.update({ where: { id: s.id }, data: { status: "abandoned", endedAt: new Date() } });
    }
    return { ok: true };
  });
}
