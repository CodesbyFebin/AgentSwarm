# AgentSwarm — Node.js 24 + Bun multi-stage build
# Staging candidate only: does not provide isolated agent execution.
FROM oven/bun:1 AS dependencies
WORKDIR /workspace
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS builder
WORKDIR /workspace
COPY --from=dependencies /workspace/node_modules ./node_modules
COPY . .
# Prisma schema in this repository targets PostgreSQL; no database migration runs at image build.
RUN bunx prisma generate --schema=prisma/schema.prisma
RUN bun run build

FROM node:24-bookworm-slim AS production-runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Prisma's Linux engine uses OpenSSL at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 swarm \
    && useradd --uid 10001 --gid swarm --no-create-home --shell /usr/sbin/nologin swarm
COPY --from=builder --chown=swarm:swarm /workspace/.next/standalone ./
COPY --from=builder --chown=swarm:swarm /workspace/.next/static ./.next/static
COPY --from=builder --chown=swarm:swarm /workspace/public ./public
USER swarm
EXPOSE 3000
CMD ["node", "server.js"]
