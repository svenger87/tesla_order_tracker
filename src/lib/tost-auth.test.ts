import { describe, test, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { withTostAuth, tostRouteLabel } from './tost-auth'
import { getTostLogs, clearTostLogs } from './tost-debug-log'
import { invalidateKeyCache } from './api-consumers'
import { resetRateLimits } from './rate-limit'
import type { GateDeps } from './api-auth'
import type { UsageEvent } from './api-usage'

vi.mock('./db', () => ({ prisma: {} }))

function makeDeps() {
  const events: UsageEvent[] = []
  const deps: GateDeps = {
    env: { tost: 'tost-secret', external: 'external-secret' },
    lookup: { findByHash: async () => null },
    usage: { requestsOn: async () => 1_000_000, record: async (e) => { events.push(e) } },
    now: () => Date.UTC(2026, 8, 19, 12),
  }
  return { deps, events }
}

const handler = vi.fn(async () => NextResponse.json({ success: true, data: [{ id: 'o1' }] }))

function req(key: string | undefined, path: string, method = 'GET', body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { ...(key && { 'X-API-Key': key }), 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
}

const TOST_PATHS: [string, string][] = [
  ['GET', '/api/v1/tost/orders'],
  ['POST', '/api/v1/tost/orders'],
  ['PUT', '/api/v1/tost/orders/o1'],
  ['DELETE', '/api/v1/tost/orders/o1'],
  ['POST', '/api/v1/tost/claim/o1'],
  ['GET', '/api/v1/tost/debug'],
  ['DELETE', '/api/v1/tost/debug'],
]

beforeEach(() => {
  clearTostLogs()
  resetRateLimits()
  invalidateKeyCache()
  handler.mockClear()
})

describe('tostRouteLabel', () => {
  test('normalises ids', () => {
    expect(tostRouteLabel('PUT', '/api/v1/tost/orders/abc')).toBe('PUT /v1/tost/orders/[id]')
    expect(tostRouteLabel('POST', '/api/v1/tost/claim/abc')).toBe('POST /v1/tost/claim/[id]')
    expect(tostRouteLabel('GET', '/api/v1/tost/orders')).toBe('GET /v1/tost/orders')
  })
})

describe('withTostAuth (TOST regression)', () => {
  test.each(TOST_PATHS)('TOST key reaches %s %s', async (method, path) => {
    const { deps } = makeDeps()
    const body = method === 'POST' || method === 'PUT' ? { a: 1 } : undefined
    const res = await withTostAuth(handler, () => deps)(req('tost-secret', path, method, body))
    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('TOST key is never rate limited', async () => {
    const { deps } = makeDeps()
    for (let i = 0; i < 300; i++) {
      const res = await withTostAuth(handler, () => deps)(req('tost-secret', '/api/v1/tost/orders'))
      expect(res.status).toBe(200)
    }
  })

  test('logs successful calls with request body and summarized response', async () => {
    const { deps, events } = makeDeps()
    await withTostAuth(handler, () => deps)(req('tost-secret', '/api/v1/tost/orders', 'POST', { name: 'x' }))
    const [log] = getTostLogs()
    expect(log).toMatchObject({
      method: 'POST', path: '/api/v1/tost/orders', requestBody: { name: 'x' }, responseStatus: 200,
      responseBody: { success: true, count: 1, ids: ['o1'] },
    })
    expect(events[0]).toMatchObject({ consumerId: 'builtin:tost', endpoint: 'POST /v1/tost/orders', isError: false })
  })

  test('logs failed auth exactly as before', async () => {
    const { deps } = makeDeps()
    const res = await withTostAuth(handler, () => deps)(req('wrong', '/api/v1/tost/orders'))
    expect(res.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
    expect(getTostLogs()[0]).toMatchObject({ responseStatus: 401, responseBody: { error: 'Authentication failed' } })
  })

  test('the external key is rejected on TOST routes', async () => {
    const { deps } = makeDeps()
    const res = await withTostAuth(handler, () => deps)(req('external-secret', '/api/v1/tost/orders'))
    expect(res.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()
    expect(getTostLogs()[0].responseStatus).toBe(403)
  })

  test('TOST_API_KEY unset → 500 as before', async () => {
    const { deps } = makeDeps()
    deps.env = { external: 'external-secret' }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await withTostAuth(handler, () => deps)(req('tost-secret', '/api/v1/tost/orders'))
    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})
