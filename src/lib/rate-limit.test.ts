import { describe, test, expect, beforeEach } from 'vitest'
import { checkRateLimit, resetRateLimits } from './rate-limit'

const RULE = { limit: 3, windowMs: 60_000 }

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimits()
  })

  test('allows requests up to the limit', () => {
    expect(checkRateLimit('login:1.2.3.4', RULE, 0).allowed).toBe(true)
    expect(checkRateLimit('login:1.2.3.4', RULE, 100).allowed).toBe(true)
    expect(checkRateLimit('login:1.2.3.4', RULE, 200).allowed).toBe(true)
  })

  test('blocks the request that exceeds the limit', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('login:1.2.3.4', RULE, i)
    expect(checkRateLimit('login:1.2.3.4', RULE, 300).allowed).toBe(false)
  })

  test('reports how long to wait before retrying', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('login:1.2.3.4', RULE, 0)
    const result = checkRateLimit('login:1.2.3.4', RULE, 15_000)
    expect(result.retryAfterSeconds).toBe(45)
  })

  test('allows requests again once the window has passed', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('login:1.2.3.4', RULE, 0)
    expect(checkRateLimit('login:1.2.3.4', RULE, 60_001).allowed).toBe(true)
  })

  test('counts each key separately', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('login:1.2.3.4', RULE, i)
    expect(checkRateLimit('login:5.6.7.8', RULE, 300).allowed).toBe(true)
  })

  test('does not let one route consume another route budget', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('login:1.2.3.4', RULE, i)
    expect(checkRateLimit('claim:1.2.3.4', RULE, 300).allowed).toBe(true)
  })
})
