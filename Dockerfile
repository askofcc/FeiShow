# syntax=docker/dockerfile:1.7
ARG NEXT_PUBLIC_THEME
ARG FEISHU_ACTIVE_THEME

FROM node:20-alpine AS base
ENV YARN_CACHE_FOLDER=/root/.cache/yarn

# 1. Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/root/.cache/yarn \
    yarn install --frozen-lockfile --network-timeout 600000 --prefer-offline && \
    yarn cache clean

# 2. Rebuild the source code only when needed
FROM base AS builder
ARG NEXT_PUBLIC_THEME
ARG FEISHU_ACTIVE_THEME
ENV NEXT_PUBLIC_THEME=${NEXT_PUBLIC_THEME}
ENV FEISHU_ACTIVE_THEME=${FEISHU_ACTIVE_THEME}
ENV NODE_ENV=production
ENV NEXT_BUILD_STANDALONE=true
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Leverage BuildKit cache mount for Next.js build cache to speed up rebuilds
RUN --mount=type=secret,id=feishu_env \
    --mount=type=cache,target=/app/.next/cache \
    set -a; . /run/secrets/feishu_env; set +a; \
    export ENABLE_CACHE=true \
      NEXT_REVALIDATE_SECOND=300 \
      NEXT_PUBLIC_REVALIDATE_SECOND=300; \
    FEISHU_ENV_FILE=/run/secrets/feishu_env yarn build

# 3. Production image, copy all the files and run next
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
