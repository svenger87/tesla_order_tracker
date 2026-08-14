# Legacy SQL migrations

These files are kept for reference only. **Do not run them.**

They are hand-written one-shots from before the current deployment mechanism
existed, and they used to sit in `prisma/migrations/` next to the real Prisma
migrations — which made it look as though there were eleven migrations applied
in some order, when in fact none of these are applied by anything.

Some of them also contain seed rows (options, constraints, compositor codes).
Those are now handled by the admin UI's seed actions, not by SQL.

## How schema changes actually reach production

Three mechanisms exist in this repository and only one of them runs on the
server:

| Mechanism | When it runs | What it does |
|---|---|---|
| `scripts/migrate-schema.mjs` | **every container start** | Diffs `schema-template.db` against the live database and adds missing tables, columns and indexes |
| `prisma/migrations/` | never, in production | Prisma's own migration history, kept for local development |
| these files | never | history |

`schema-template.db` is built into the image from `prisma/schema.prisma`:

```dockerfile
RUN DATABASE_URL="file:/app/schema-template.db" npx prisma db push --accept-data-loss
```

So the practical rule is: **change `prisma/schema.prisma`, and the next deploy
picks it up.** The migration step is additive — it creates what is missing. It
does not drop columns, rename them, or backfill data. Anything destructive or
data-shaped needs a script in `scripts/`, run deliberately.
