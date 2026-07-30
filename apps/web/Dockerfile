# Client. Context de build: l'ARREL del monorepo (cal el lockfile i `packages/shared`).
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @quizcat/web...

COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @quizcat/web build

# ── Producció: nginx serveix l'estàtic i fa de porta d'entrada de l'API ──
FROM nginx:alpine AS production
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ || exit 1
