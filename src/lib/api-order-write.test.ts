import { describe, test, expect } from 'vitest'
import {
  createBrake, dateSequenceProblem, refundCodeAttempt, reserveCodeAttempt, writeBrake,
  V1_CALLER_CODE_RULE, V1_CREATE_RULE, V1_ORDER_CODE_RULE, V1_WRITE_RULE,
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
  test('one caller runs out of guesses; another caller and the owner do not', () => {
    const now = 5_000_000
    const order = 'order-a'
    for (let i = 0; i < V1_CALLER_CODE_RULE.limit; i++) expect(reserveCodeAttempt(req('6.6.6.6'), key, order, now)).toBeNull()
    expect(reserveCodeAttempt(req('6.6.6.6'), key, order, now)?.status).toBe(429)
    // The order itself is not locked by one caller.
    expect(reserveCodeAttempt(req('7.7.7.7'), key, order, now)).toBeNull()
  })

  test('the order locks only when many callers fail on it', () => {
    const now = 6_000_000
    const order = 'order-b'
    let n = 0
    for (let ip = 0; n < V1_ORDER_CODE_RULE.limit; ip++) {
      for (let i = 0; i < V1_CALLER_CODE_RULE.limit && n < V1_ORDER_CODE_RULE.limit; i++, n++) {
        expect(reserveCodeAttempt(req(`10.0.0.${ip}`), key, order, now)).toBeNull()
      }
    }
    expect(reserveCodeAttempt(req('10.0.1.1'), key, order, now)?.status).toBe(429)
    expect(reserveCodeAttempt(req('10.0.1.1'), key, 'order-c', now)).toBeNull()
  })

  test('the attempt is reserved before the code is checked, so a parallel burst cannot overrun it', () => {
    const now = 7_000_000
    const results = Array.from({ length: V1_CALLER_CODE_RULE.limit + 5 }, () => reserveCodeAttempt(req('8.8.4.4'), key, 'order-d', now))
    expect(results.filter(r => r === null)).toHaveLength(V1_CALLER_CODE_RULE.limit)
  })

  test('a right code gives the attempt back', () => {
    const now = 8_000_000
    for (let i = 0; i < V1_CALLER_CODE_RULE.limit * 3; i++) {
      expect(reserveCodeAttempt(req('9.9.4.4'), key, 'order-e', now)).toBeNull()
      refundCodeAttempt(req('9.9.4.4'), key, 'order-e', now)
    }
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
