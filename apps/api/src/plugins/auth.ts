import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function registerAuth(app: FastifyInstance) {
  // En producció el secret NO pot tenir valor per defecte: amb un fallback conegut,
  // qualsevol pot signar-se un token vàlid. Val més que l'arrencada peti.
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET no està definit: en producció és obligatori.");
    }
    app.log.warn("JWT_SECRET no definit; s'usa un secret de dev. No serveix per a producció.");
  }
  await app.register(fastifyJwt, { secret: secret ?? "dev-secret" });
  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: "unauthorized" });
    }
  });
}
