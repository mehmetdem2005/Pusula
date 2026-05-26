FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

WORKDIR /app

# Workspace dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.base.json ./
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY apps/worker-cron ./apps/worker-cron

# Install (deduped via workspace)
RUN pnpm install --frozen-lockfile

# Build
WORKDIR /app/apps/worker-cron
RUN pnpm run build || true

# Run
ENV NODE_ENV=production
CMD ["node", "--enable-source-maps", "dist/index.js"]
