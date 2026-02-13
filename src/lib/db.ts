import { createClient, type Client, type InArgs, type ResultSet } from '@libsql/client/web'

// Lazy singleton — avoids URL validation at build time when env vars are absent
const globalForDb = globalThis as unknown as { db: Client | undefined }

function getDb(): Client {
  if (globalForDb.db) return globalForDb.db

  const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL_PREVIEW || ''
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN_PREVIEW

  const client = createClient({
    url,
    ...(authToken && { authToken }),
  })

  if (process.env.NODE_ENV !== 'production') globalForDb.db = client
  return client
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Run a query and return all rows, typed as T[]. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  args: unknown[] = [],
): Promise<T[]> {
  const rs: ResultSet = await getDb().execute({ sql, args: args as InArgs })
  return rs.rows as unknown as T[]
}

/** Run a query and return the first row or null. */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  args: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, args)
  return rows[0] ?? null
}

/** Run a write statement (INSERT / UPDATE / DELETE) and return metadata. */
export async function execute(sql: string, args: unknown[] = []): Promise<ResultSet> {
  return getDb().execute({ sql, args: args as InArgs })
}

/** Run multiple statements in a batch (implicit transaction). */
export async function batch(
  stmts: Array<{ sql: string; args?: InArgs }>,
): Promise<ResultSet[]> {
  return getDb().batch(
    stmts.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    'write',
  )
}

/** Generate a cuid-like random ID (matches Prisma's @default(cuid()) length). */
export function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 25)
}

/** SQLite stores booleans as 0/1. Convert to JS boolean. */
export function toBool(v: unknown): boolean {
  return v === 1 || v === '1' || v === true
}

/** Current timestamp in ISO format for createdAt/updatedAt. */
export function nowISO(): string {
  return new Date().toISOString()
}
