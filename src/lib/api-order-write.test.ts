import { describe, test, expect } from 'vitest'
import {
  createBrake, dateSequenceProblem, failedCodeLock, recordFailedCode, writeBrake,
  V1_CREATE_RULE, V1_FAILED_CODE_RULE, V1_WRITE_RULE,
} from './api-order-write'
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

describe('edit-code guessing', () => {
  const order = 'order-guess-test'

  test('locks an order after too many wrong codes, and only that order', () => {
    const now = 5_000_000
    for (let i = 0; i < V1_FAILED_CODE_RULE.limit; i++) {
      expect(failedCodeLock(order, now)).toBeNull()
      recordFailedCode(order, now)
    }
    const res = failedCodeLock(order, now)
    expect(res?.status).toBe(429)
    expect(failedCodeLock('another-order', now)).toBeNull()
    // The lock lifts when the window has passed.
    expect(failedCodeLock(order, now + V1_FAILED_CODE_RULE.windowMs)).toBeNull()
  })

  test('checking the lock does not count as an attempt', () => {
    for (let i = 0; i < V1_FAILED_CODE_RULE.limit * 3; i++) expect(failedCodeLock('peek-only', 0)).toBeNull()
  })
})

describe('writeBrake', () => {
  test('limits updates per address and key; built-ins exempt', () => {
    const now = 9_000_000
    for (let i = 0; i < V1_WRITE_RULE.limit; i++) expect(writeBrake(req('4.4.4.4'), key, now)).toBeNull()
    expect(writeBrake(req('4.4.4.4'), key, now)?.status).toBe(429)
    expect(writeBrake(req('5.5.5.5'), key, now)).toBeNull()
    for (let i = 0; i < V1_WRITE_RULE.limit + 1; i++) expect(writeBrake(req('4.4.4.4'), BUILTIN_CONSUMERS.external, now)).toBeNull()
  })
})
