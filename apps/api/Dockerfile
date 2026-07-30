# API. El context de build és l'ARREL del monorepo, no aquesta carpeta: fan falta el
# lockfile, el workspace i `packages/shared`.
#
# Per què s'executa amb `tsx` i no es compila: `@quizcat/shared` publica TypeScript
# directament (`main: src/index.ts`) i el tsconfig fa servir `moduleResolution: Bundler`.
# Compilar amb tsc voldria dir reestructurar el paquet compartit; no és el moment de
# fer-ho i tsx arrenca de sobres per a una API d'aquesta mida.
FROM node:22-alpine
WORKDIR /app
RUN corepack enable

# Primer només els manifests: així la capa d'instal·lació es reaprofita mentre no
# canviïn les dependències.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
# Sense `--prod`: tsx i prisma són devDependencies i totes dues fan falta per arrencar.
RUN pnpm install --frozen-lockfile --filter @quizcat/api...

COPY packages/shared packages/shared
COPY apps/api apps/api

# El client de Prisma es genera dins de la imatge (depèn de la plataforma).
RUN pnpm --filter @quizcat/api exec prisma generate

ENV NODE_ENV=production
ENV PORT=4400
EXPOSE 4400

HEALTHCHECK --interval=30s --timeout=3s --retries=5 --start-period=15s \
  CMD wget -qO- http://127.0.0.1:4400/health || exit 1

# Les migracions s'apliquen sempre; el seed només si s'hi demana explícitament
# (SEED_ON_BOOT=1). Tornar-lo a executar no trenca res, però NO és del tot idempotent:
# les preguntes de "més alt o més baix" surten de parelles a l'atzar i cada passada
# n'afegeix de noves (~35). Per això va a 0 per defecte: primer desplegament sí, cada
# reinici no.
CMD ["sh", "-c", "pnpm --filter @quizcat/api exec prisma migrate deploy && if [ \"$SEED_ON_BOOT\" = \"1\" ]; then pnpm --filter @quizcat/api seed; fi && pnpm --filter @quizcat/api exec tsx src/server.ts"]
