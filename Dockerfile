ARG NEXT_PUBLIC_THEME
ARG FEISHU_ACTIVE_THEME

FROM node:20-alpine AS base
ENV YARN_CACHE_FOLDER=/root/.cache/yarn
# Default to npmmirror: registry.yarnpkg.com is often unusable from CN Docker VMs.
ARG YARN_REGISTRY=https://registry.npmmirror.com
ENV YARN_REGISTRY=${YARN_REGISTRY}

# 1. Install dependencies only when needed
FROM base AS deps
ARG YARN_REGISTRY=https://registry.npmmirror.com
ENV YARN_REGISTRY=${YARN_REGISTRY}
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock ./
# Do not cache-mount yarn. The mount grew to ~3GB across failed installs and is
# not needed at runtime. npmmirror is fast enough for a clean install.
RUN sed -i \
      -e 's#https://registry.yarnpkg.com#https://registry.npmmirror.com#g' \
      -e 's#https://registry.npmjs.org#https://registry.npmmirror.com#g' \
      yarn.lock && \
    yarn install --frozen-lockfile --network-timeout 120000 --prefer-offline --registry "$YARN_REGISTRY" && \
    rm -rf \
      node_modules/@lhci \
      node_modules/lighthouse \
      node_modules/puppeteer-core \
      node_modules/chromium-bidi \
      node_modules/canvas \
      node_modules/jest \
      node_modules/jest-environment-jsdom \
      node_modules/jest-junit \
      node_modules/@testing-library \
      node_modules/eslint \
      node_modules/eslint-config-next \
      node_modules/eslint-config-prettier \
      node_modules/eslint-plugin-import \
      node_modules/eslint-plugin-node \
      node_modules/eslint-plugin-prettier \
      node_modules/eslint-plugin-react \
      node_modules/eslint-plugin-react-hooks \
      node_modules/@typescript-eslint \
      node_modules/prettier \
      node_modules/@netlify \
      node_modules/webpack-bundle-analyzer && \
    yarn cache clean && \
    rm -rf /root/.cache/yarn /tmp/yarn-*

# 2. Rebuild the source code only when needed
FROM base AS builder
ARG NEXT_PUBLIC_THEME
ARG FEISHU_ACTIVE_THEME
ENV NEXT_PUBLIC_THEME=${NEXT_PUBLIC_THEME}
ENV FEISHU_ACTIVE_THEME=${FEISHU_ACTIVE_THEME}
ENV NODE_ENV=production
ENV NEXT_BUILD_STANDALONE=true
ENV NEXT_TELEMETRY_DISABLED=1
# Docker Desktop VMs are often 4GiB. A 4GiB Node heap plus webpack/ISR cache
# swaps into Docker.raw and makes each rebuild slower.
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV BUILD_PREFETCH_ENABLED=false
ENV NEXT_DISABLE_WEBPACK_CACHE=true
ENV SKIP_BUILD_PRERENDER=true

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Do not cache-mount the whole `.next/cache` directory. That persisted
# webpack packs and Feishu/Notion JSON across deploys and grew without bound.
RUN --mount=type=secret,id=feishu_env \
    set -a; . /run/secrets/feishu_env; set +a; \
    export ENABLE_CACHE=true \
      NEXT_REVALIDATE_SECOND=300 \
      NEXT_PUBLIC_REVALIDATE_SECOND=300 \
      BUILD_PREFETCH_ENABLED=false \
      NEXT_DISABLE_WEBPACK_CACHE=true \
      SKIP_BUILD_PRERENDER=true; \
    FEISHU_ENV_FILE=/run/secrets/feishu_env yarn build

# 3. Production image, copy all the files and run next
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=512"

WORKDIR /app

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
