# syntax=docker/dockerfile:1.7

# ─── Builder stage — build Vite SPA ──────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /repo

# pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

# Install deps (workspace-aware)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --filter @chdpu/web...

# Copy source
COPY apps/web ./apps/web

# Build (Vite reads VITE_* at build time)
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter @chdpu/web build


# ─── Runtime stage — Nginx serving static files ──────────────────
FROM nginx:1.27-alpine AS runtime

# Replace default config
COPY infra/nginx/web.conf /etc/nginx/conf.d/default.conf

# Static assets
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz || exit 1
