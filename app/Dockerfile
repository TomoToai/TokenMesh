ARG NODE_IMAGE=node:22-bookworm-slim
ARG NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

FROM ${NODE_IMAGE} AS deps

ARG NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm config set registry ${NPM_CONFIG_REGISTRY}
RUN npm install -g npm@11.6.2
RUN npm ci

FROM ${NODE_IMAGE} AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ARG NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3001
ENV DATABASE_PATH=/app/data/tokenmesh.db

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/data \
  && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

CMD ["node", "server.js"]
