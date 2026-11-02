import { describe, test, expect } from 'vitest'
import { createBrake, dateSequenceProblem, V1_CREATE_RULE } from './api-order-write'
import { BUILTIN_CONSUMERS, type ApiConsumer } from './api-consumers'

const key: ApiConsumer = {
  id: 'brake-test-key', name: 'App', builtin: false, scopes: ['orders:write'],
  source: 'App', ratePerMinute: 60, quotaPerDay: 5000,
}

function req(ip: string) {
  return new Request('http://x/api/v1/orders', { method: 'POST', headers: { 'x-forwarded-for': ip } })
}

describe('createBrake', () => {
  test('lets one address create the hourly allowance, then answers 429', () => {
    const now = 1_000_000
    for (let i = 0; i < V1_CREATE_RULE.limit; i++) expect(createBrake(req('1.1.1.1'), key, now)).toBeNull()
    const res = createBrake(req('1.1.1.1'), key, now)
    expect(res?.status).toBe(429)
    expect(res?.headers.get('Retry-After')).toBeTruthy()
    // Another address on the same key is unaffected.
    expect(createBrake(req('2.2.2.2'), key, now)).toBeNull()
  })

  test('never brakes the built-in keys', () => {
    for (let i = 0; i < V1_CREATE_RULE.limit + 5; i++) {
      expect(createBrake(req('3.3.3.3'), BUILTIN_CONSUMERS.external, 0)).toBeNull()
    }
  })
})

describe('dateSequenceProblem', () => {
  test('rejects delivery before order', () => {
    expect(dateSequenceProblem({ orderDate: '10.05.2026', deliveryDate: '01.05.2026' })?.status).toBe(400)
  })
  test('accepts a plausible chain', () => {
    expect(dateSequenceProblem({ orderDate: '01.05.2026', deliveryDate: '10.06.2026' })).toBeNull()
  })
})
