# ─────────────────────────────────────────────
#  РАЗУМ API — Multi-stage Docker build (NestJS)
# ─────────────────────────────────────────────

# ── Stage 1: Install dependencies ────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace config and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json for each workspace package
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ───────────────────────────
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy shared package and build it
COPY packages/shared ./packages/shared
RUN pnpm --filter @razum/shared build

# Copy API source and build
COPY apps/api ./apps/api
RUN pnpm --filter @razum/api build

# ── Stage 3: Production runner ───────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built output
COPY --from=build /app/apps/api/dist ./dist

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy shared dist (needed at runtime for @razum/shared imports)
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/

# Copy Prisma generated client
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma

USER nestjs

EXPOSE 3001

# Use dumb-init to handle PID 1 and signals properly
CMD ["dumb-init", "node", "dist/apps/api/src/main.js"]
