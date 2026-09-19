import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
  resolveConsumer, invalidateKeyCache, generateApiKey, hashApiKey,
  BUILTIN_TOST_ID, BUILTIN_EXTERNAL_ID,
} from './api-consumers'
import type { ApiKeyLookup, ApiKeyRecord } from './api-key-store'

vi.mock('./db', () => ({ prisma: {} }))

const env = { tost: 'tost-secret', external: 'external-secret' }

function lookupWith(records: Record<string, ApiKeyRecord>) {
  const findByHash = vi.fn(async (hash: string) => records[hash] ?? null)
  return { lookup: { findByHash } satisfies ApiKeyLookup, findByHash }
}

const dbKey = generateApiKey()
const record: ApiKeyRecord = {
  id: 'key1', name: 'Canada', scopes: 'orders:read,options:read',
  ratePerMinute: 60, quotaPerDay: 5000, revokedAt: null,
}

beforeEach(() => invalidateKeyCache())

describe('generateApiKey', () => {
  test('produces a tff_ secret, its hash and an 8-char prefix', () => {
    expect(dbKey.secret).toMatch(/^tff_[A-Za-z0-9_-]{43}$/)
    expect(dbKey.hash).toBe(hashApiKey(dbKey.secret))
    expect(dbKey.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(dbKey.prefix).toBe(dbKey.secret.slice(0, 8))
  })
})

describe('resolveConsumer', () => {
  test('TOST_API_KEY resolves to the unlimited built-in with the tost scope', async () => {
    const { lookup, findByHash } = lookupWith({})
    const c = await resolveConsumer('tost-secret', 'tost', { env, lookup, now: 0 })
    expect(c).toMatchObject({ id: BUILTIN_TOST_ID, builtin: true, scopes: ['tost'], ratePerMinute: null, quotaPerDay: null })
    expect(findByHash).not.toHaveBeenCalled()
  })

  test('EXTERNAL_API_KEY resolves to the built-in with all non-tost scopes', async () => {
    const { lookup } = lookupWith({})
    const c = await resolveConsumer('external-secret', 'orders:read', { env, lookup, now: 0 })
    expect(c?.id).toBe(BUILTIN_EXTERNAL_ID)
    expect(c?.scopes).toEqual(['orders:read', 'orders:read:pii', 'orders:write', 'options:read'])
  })

  test('when both env keys are equal, picks the built-in that has the scope', async () => {
    const same = { tost: 'same', external: 'same' }
    const { lookup } = lookupWith({})
    expect((await resolveConsumer('same', 'tost', { env: same, lookup, now: 0 }))?.id).toBe(BUILTIN_TOST_ID)
    expect((await resolveConsumer('same', 'orders:read', { env: same, lookup, now: 0 }))?.id).toBe(BUILTIN_EXTERNAL_ID)
  })

  test('unset env keys are skipped', async () => {
    const { lookup } = lookupWith({})
    expect(await resolveConsumer('tost-secret', 'tost', { env: {}, lookup, now: 0 })).toBeNull()
  })

  test('a DB key resolves by hash with its scopes and limits', async () => {
    const { lookup } = lookupWith({ [dbKey.hash]: record })
    const c = await resolveConsumer(dbKey.secret, 'orders:read', { env, lookup, now: 0 })
    expect(c).toEqual({
      id: 'key1', name: 'Canada', builtin: false,
      scopes: ['orders:read', 'options:read'], ratePerMinute: 60, quotaPerDay: 5000,
    })
  })

  test('unknown and revoked keys resolve to null', async () => {
    const { lookup } = lookupWith({ [dbKey.hash]: { ...record, revokedAt: new Date() } })
    expect(await resolveConsumer(dbKey.secret, 'orders:read', { env, lookup, now: 0 })).toBeNull()
    expect(await resolveConsumer('tff_nope', 'orders:read', { env, lookup, now: 0 })).toBeNull()
  })

  test('caches lookups for 60 seconds and clears on invalidate', async () => {
    const { lookup, findByHash } = lookupWith({ [dbKey.hash]: record })
    await resolveConsumer(dbKey.secret, 'orders:read', { env, lookup, now: 0 })
    await resolveConsumer(dbKey.secret, 'orders:read', { env, lookup, now: 59_999 })
    expect(findByHash).toHaveBeenCalledTimes(1)
    await resolveConsumer(dbKey.secret, 'orders:read', { env, lookup, now: 60_000 })
    expect(findByHash).toHaveBeenCalledTimes(2)
    invalidateKeyCache()
    await resolveConsumer(dbKey.secret, 'orders:read', { env, lookup, now: 60_001 })
    expect(findByHash).toHaveBeenCalledTimes(3)
  })
})
