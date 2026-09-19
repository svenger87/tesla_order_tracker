import { createHash, randomBytes } from 'crypto'
import { secretsMatch } from './secrets'
import { parseScopes, type ApiScope } from './api-scopes'
import type { ApiKeyLookup, ApiKeyRecord } from './api-key-store'

/** Who is calling. Built-in consumers come from env vars; the rest are ApiKey rows. */
export interface ApiConsumer {
  id: string
  name: string
  builtin: boolean
  scopes: ApiScope[]
  /** null = not limited. */
  ratePerMinute: number | null
  quotaPerDay: number | null
}

export const BUILTIN_TOST_ID = 'builtin:tost'
export const BUILTIN_EXTERNAL_ID = 'builtin:external'

/**
 * The two env keys, with exactly the reach they had before per-consumer keys
 * existed. Never limited: the TOST sync must not start meeting 429s.
 */
export const BUILTIN_CONSUMERS: { tost: ApiConsumer; external: ApiConsumer } = {
  tost: {
    id: BUILTIN_TOST_ID, name: 'TOST', builtin: true,
    scopes: ['tost'], ratePerMinute: null, quotaPerDay: null,
  },
  external: {
    id: BUILTIN_EXTERNAL_ID, name: 'External (legacy)', builtin: true,
    scopes: ['orders:read', 'orders:read:pii', 'orders:write', 'options:read'],
    ratePerMinute: null, quotaPerDay: null,
  },
}

export interface EnvKeys {
  tost?: string
  external?: string
}

export function envKeys(): EnvKeys {
  return {
    tost: process.env.TOST_API_KEY || undefined,
    external: process.env.EXTERNAL_API_KEY || undefined,
  }
}

export function hashApiKey(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}

export function generateApiKey(): { secret: string; hash: string; prefix: string } {
  const secret = `tff_${randomBytes(32).toString('base64url')}`
  return { secret, hash: hashApiKey(secret), prefix: secret.slice(0, 8) }
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, { record: ApiKeyRecord | null; expiresAt: number }>()

/** Called after any admin change to a key, so revocation takes effect at once. */
export function invalidateKeyCache() {
  cache.clear()
}

function fromRecord(record: ApiKeyRecord): ApiConsumer {
  return {
    id: record.id,
    name: record.name,
    builtin: false,
    scopes: parseScopes(record.scopes),
    ratePerMinute: record.ratePerMinute,
    quotaPerDay: record.quotaPerDay,
  }
}

export async function resolveConsumer(
  secret: string,
  requiredScope: ApiScope,
  deps: { env: EnvKeys; lookup: ApiKeyLookup; now: number },
): Promise<ApiConsumer | null> {
  const builtins: ApiConsumer[] = []
  if (deps.env.tost && secretsMatch(secret, deps.env.tost)) builtins.push(BUILTIN_CONSUMERS.tost)
  if (deps.env.external && secretsMatch(secret, deps.env.external)) builtins.push(BUILTIN_CONSUMERS.external)
  if (builtins.length) {
    // Both env vars may hold the same value; then each route family keeps working.
    return builtins.find(c => c.scopes.includes(requiredScope)) ?? builtins[0]
  }

  // A lookup by hash on a unique index: no raw secret is compared, so there is
  // nothing for timing to leak.
  const hash = hashApiKey(secret)
  let entry = cache.get(hash)
  if (!entry || entry.expiresAt <= deps.now) {
    entry = { record: await deps.lookup.findByHash(hash), expiresAt: deps.now + CACHE_TTL_MS }
    cache.set(hash, entry)
  }
  if (!entry.record || entry.record.revokedAt) return null
  return fromRecord(entry.record)
}
