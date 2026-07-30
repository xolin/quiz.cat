import "./env.js"; // primer de tot: omple process.env abans que cap mòdul llegeixi variables
import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import { registerAuth } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { matchRoutes } from "./routes/matches.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";
import { minigameRoutes } from "./routes/minigame.js";
import { premiumRoutes } from "./routes/premium.js";
import { topicRoutes } from "./routes/topics.js";
import { communityRoutes } from "./routes/community.js";
import { adminRoutes } from "./routes/admin.js";

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await registerAuth(app);

app.get("/health", async () => ({ ok: true }));

authRoutes(app, prisma);
matchRoutes(app, prisma);
leaderboardRoutes(app, prisma);
minigameRoutes(app, prisma);
premiumRoutes(app, prisma);
topicRoutes(app, prisma);
communityRoutes(app, prisma);
adminRoutes(app, prisma);

const port = Number(process.env.PORT ?? 4400);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
