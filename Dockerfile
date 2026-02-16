FROM node:22-alpine AS base
RUN apk add --no-cache python3 make g++

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci
RUN npx prisma generate

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_PRIVATE_WORKER_THREADS=2
RUN npx prisma generate
RUN npm run build
RUN DATABASE_URL="file:/app/schema-template.db" npx prisma db push --accept-data-loss

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated
COPY --from=builder --chown=nextjs:nodejs /app/schema-template.db ./schema-template.db
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate-schema.mjs ./scripts/migrate-schema.mjs
RUN mkdir -p /app/data /app/data/compositor-cache && chown -R nextjs:nodejs /app/data
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/prod.db
CMD ["sh", "-c", "node scripts/migrate-schema.mjs && node server.js"]
