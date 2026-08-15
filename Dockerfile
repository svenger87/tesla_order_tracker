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
ARG UMAMI_WEBSITE_ID
ENV UMAMI_WEBSITE_ID=${UMAMI_WEBSITE_ID}
ENV NEXT_PRIVATE_WORKER_THREADS=2
RUN npx prisma generate
# Retried because the build reaches out to Google Fonts: next/font downloads the
# five families at build time, and when that fetch fails the whole image fails
# with a module-not-found for a font stylesheet. It has taken down three
# otherwise good deploys. Nothing else here is flaky, so a plain second attempt
# is the cheapest answer that does not mean self-hosting several megabytes of
# CJK faces. A real failure still fails, just twice.
RUN npm run build \
    || (echo ">>> Build failed — retrying once (usually next/font fetching Google Fonts)" && sleep 5 && npm run build)
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
