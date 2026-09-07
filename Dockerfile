# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma generate only — real DB URL at runtime
ARG DATABASE_URL="postgresql://pnk:pnk@127.0.0.1:5432/pnk_mail?schema=public"
ENV DATABASE_URL=$DATABASE_URL
# NEXT_PUBLIC_* are inlined at build time — pass real prod URLs via compose build.args
ARG NEXT_PUBLIC_PNK_ID_URL=http://localhost:3100
ARG NEXT_PUBLIC_MAIL_URL=http://localhost:3000
ENV NEXT_PUBLIC_PNK_ID_URL=$NEXT_PUBLIC_PNK_ID_URL
ENV NEXT_PUBLIC_MAIL_URL=$NEXT_PUBLIC_MAIL_URL
ARG PNK_ID_CLIENT_SECRET=build-time-placeholder
ARG MAIL_VAULT_SECRET=build-time-placeholder-min-32-characters!!
ENV PNK_ID_CLIENT_SECRET=$PNK_ID_CLIENT_SECRET
ENV MAIL_VAULT_SECRET=$MAIL_VAULT_SECRET
RUN npx prisma generate && npx next build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENTRYPOINT ["./entrypoint.sh"]
