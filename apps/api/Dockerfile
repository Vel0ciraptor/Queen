# Queen Style API — monorepo build (build context: repo root)
# Build: docker build -f apps/api/Dockerfile .

# Node slim (Debian) en vez de Alpine: Prisma no detecta la versión de OpenSSL en
# Alpine 3.19+ (solo trae OpenSSL 3) y su schema engine falla con
# "Could not parse schema engine response" → el contenedor entra en crash-loop.
FROM node:20-slim AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace=apps/api

FROM node:20-slim AS runtime
WORKDIR /repo
# openssl CLI: respaldo para que la detección de versión de Prisma nunca falle
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
# --include=dev: NODE_ENV=production haria que npm omita devDeps,
# pero aqui necesitamos `prisma` (CLI), `ts-node` y `typescript` para migrar y sembrar
RUN npm ci --include=dev

COPY --from=build /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /repo/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/package.json apps/api/nest-cli.json apps/api/tsconfig.build.json ./apps/api/

WORKDIR /repo/apps/api
RUN mkdir -p uploads/products

EXPOSE 3000
CMD ["sh", "-c", "set -e; npx prisma migrate deploy --schema prisma/schema.prisma; npx prisma db seed || echo '[seed] omitido'; exec node dist/main.js"]
