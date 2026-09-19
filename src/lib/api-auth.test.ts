import { describe, test, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeApiRequest, withApiAuth, getApiConsumer, type GateDeps } from './api-auth'
import { generateApiKey, invalidateKeyCache } from './api-consumers'
import { resetRateLimits } from './rate-limit'
import type { UsageEvent } from './api-usage'
import type { ApiKeyRecord } from './api-key-store'

vi.mock('./db', () => ({ prisma: {} }))

const NOON = Date.UTC(2026, 8, 19, 12, 0, 0)
const key = generateApiKey()
const baseRecord: ApiKeyRecord = {
  id: 'key1', name: 'Canada', scopes: 'orders:read,options:read',
  ratePerMinute: 2, quotaPerDay: 1000, revokedAt: null,
}

function makeDeps(opts: { record?: ApiKeyRecord; usedToday?: number; env?: GateDeps['env'] } = {}) {
  const events: UsageEvent[] = []
  const deps: GateDeps = {
    env: opts.env ?? { tost: 'tost-secret', external: 'external-secret' },
    lookup: { findByHash: async (h) => (h === key.hash ? opts.record ?? baseRecord : null) },
    usage: {
      requestsOn: async () => opts.usedToday ?? 0,
      record: async (e) => { events.push(e) },
    },
    now: () => NOON,
  }
  return { deps, events }
}

function req(apiKey?: string, path = '/api/v1/orders') {
  return new NextRequest(`http://localhost${path}`, { headers: apiKey ? { 'X-API-Key': apiKey } : {} })
}

const ORDERS_READ = { scope: 'orders:read', route: 'GET /v1/orders' } as const

beforeEach(() => {
  resetRateLimits()
  invalidateKeyCache()
})

describe('authorizeApiRequest', () => {
  test('missing key → 401', async () => {
    const r = await authorizeApiRequest(req(), ORDERS_READ, makeDeps().deps)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.response.status).toBe(401)
  })

  test('unknown key → 401 invalid', async () => {
    const r = await authorizeApiRequest(req('tff_wrong'), ORDERS_READ, makeDeps().deps)
    if (r.ok) throw new Error('expected rejection')
    expect(r.response.status).toBe(401)
    expect((await r.response.json()).error.message).toBe('Invalid API key')
  })

  test('env var for the route family unset and key unresolved → 500, as before', async () => {
    const r = await authorizeApiRequest(req('tff_wrong'), ORDERS_READ, makeDeps({ env: { tost: 'tost-secret' } }).deps)
    if (r.ok) throw new Error('expected rejection')
    expect(r.response.status).toBe(500)
  })

  test('a DB key still works when EXTERNAL_API_KEY is unset', async () => {
    const r = await authorizeApiRequest(req(key.secret), ORDERS_READ, makeDeps({ env: {} }).deps)
    expect(r.ok).toBe(true)
  })

  test('missing scope → 403 naming the scope', async () => {
    const r = await authorizeApiRequest(req(key.secret), { scope: 'orders:write', route: 'POST /v1/orders' }, makeDeps().deps)
    if (r.ok) throw new Error('expected rejection')
    expect(r.response.status).toBe(403)
    const body = await r.response.json()
    expect(body.error.code).toBe('INSUFFICIENT_SCOPE')
    expect(body.error.message).toContain('orders:write')
  })

  test('per-minute limit → 429 with Retry-After and rate headers', async () => {
    const { deps } = makeDeps()
    const first = await authorizeApiRequest(req(key.secret), ORDERS_READ, deps)
    expect(first.ok && first.headers).toMatchObject({ 'X-RateLimit-Limit': '2', 'X-RateLimit-Remaining': '1' })
    await authorizeApiRequest(req(key.secret), ORDERS_READ, deps)
    const third = await authorizeApiRequest(req(key.secret), ORDERS_READ, deps)
    if (third.ok) throw new Error('expected rejection')
    expect(third.response.status).toBe(429)
    expect(third.response.headers.get('Retry-After')).toBe('60')
  })

  test('daily quota → 429 with Retry-After until UTC midnight', async () => {
    const r = await authorizeApiRequest(req(key.secret), ORDERS_READ, makeDeps({ usedToday: 1000 }).deps)
    if (r.ok) throw new Error('expected rejection')
    expect(r.response.status).toBe(429)
    expect(r.response.headers.get('Retry-After')).toBe(String(12 * 3600))
    expect(r.response.headers.get('X-Quota-Remaining')).toBe('0')
  })

  test('reports the quota left after this request', async () => {
    const r = await authorizeApiRequest(req(key.secret), ORDERS_READ, makeDeps({ usedToday: 10 }).deps)
    expect(r.ok && r.headers['X-Quota-Remaining']).toBe('989')
  })

  test('a failing quota lookup lets the request through', async () => {
    const { deps } = makeDeps()
    deps.usage.requestsOn = async () => { throw new Error('db down') }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await authorizeApiRequest(req(key.secret), ORDERS_READ, deps)).ok).toBe(true)
    spy.mockRestore()
  })

  test('built-in consumers are never limited', async () => {
    const { deps } = makeDeps({ usedToday: 1_000_000 })
    for (let i = 0; i < 200; i++) {
      const r = await authorizeApiRequest(req('external-secret'), ORDERS_READ, deps)
      expect(r.ok).toBe(true)
    }
  })
})

describe('withApiAuth', () => {
  const ok = async (request: NextRequest) =>
    NextResponse.json({ consumer: getApiConsumer(request)?.id ?? null })

  test('runs the handler, exposes the consumer, sets headers, records usage', async () => {
    const { deps, events } = makeDeps()
    const res = await withApiAuth(ORDERS_READ, ok, () => deps)(req(key.secret))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ consumer: 'key1' })
    expect(res.headers.get('X-RateLimit-Limit')).toBe('2')
    expect(events).toEqual([{
      consumerId: 'key1', builtin: false, day: '2026-09-19',
      endpoint: 'GET /v1/orders', isError: false, at: new Date(NOON),
    }])
  })

  test('records rejected-but-identified requests as errors, not anonymous ones', async () => {
    const { deps, events } = makeDeps()
    await withApiAuth({ scope: 'orders:write', route: 'POST /v1/orders' }, ok, () => deps)(req(key.secret))
    await withApiAuth(ORDERS_READ, ok, () => deps)(req('tff_wrong'))
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ consumerId: 'key1', endpoint: 'POST /v1/orders', isError: true })
  })

  test('counts handler errors', async () => {
    const { deps, events } = makeDeps()
    const failing = async () => NextResponse.json({}, { status: 404 })
    await withApiAuth(ORDERS_READ, failing, () => deps)(req('external-secret'))
    expect(events[0]).toMatchObject({ consumerId: 'builtin:external', builtin: true, isError: true })
  })

  test('a usage-recording failure does not change the response', async () => {
    const { deps } = makeDeps()
    deps.usage.record = async () => { throw new Error('db down') }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await withApiAuth(ORDERS_READ, ok, () => deps)(req(key.secret))
    expect(res.status).toBe(200)
    await new Promise(r => setTimeout(r, 0))
    spy.mockRestore()
  })

  test('the consumer is not exposed when the gate rejects', async () => {
    const { deps } = makeDeps()
    const request = req('tff_wrong')
    await withApiAuth(ORDERS_READ, ok, () => deps)(request)
    expect(getApiConsumer(request)).toBeNull()
  })
})
