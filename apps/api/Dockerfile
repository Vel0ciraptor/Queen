# Queen Style API — monorepo build (build context: repo root)
# Build: docker build -f apps/api/Dockerfile .

FROM node:20-alpine AS build
WORKDIR /repo
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runtime
WORKDIR /repo
RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
# dev deps incluidos para poder ejecutar `prisma migrate deploy` y el seed
RUN npm ci

COPY --from=build /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /repo/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/package.json apps/api/nest-cli.json apps/api/tsconfig.build.json ./apps/api/

WORKDIR /repo/apps/api
RUN mkdir -p uploads/products

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && node dist/main.js"]
