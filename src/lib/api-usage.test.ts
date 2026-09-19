import { describe, test, expect } from 'vitest'
import { utcDay, secondsUntilUtcMidnight, summarizeUsage } from './api-usage'

const NOON = Date.UTC(2026, 8, 19, 12, 0, 0) // 2026-09-19T12:00:00Z

describe('utc day helpers', () => {
  test('formats the UTC date', () => {
    expect(utcDay(NOON)).toBe('2026-09-19')
    expect(utcDay(Date.UTC(2026, 8, 19, 23, 59, 59))).toBe('2026-09-19')
  })

  test('counts seconds to the next UTC midnight', () => {
    expect(secondsUntilUtcMidnight(NOON)).toBe(12 * 3600)
    expect(secondsUntilUtcMidnight(Date.UTC(2026, 8, 19, 23, 59, 59, 900))).toBe(1)
  })
})

describe('summarizeUsage', () => {
  const rows = [
    { day: '2026-09-19', endpoint: 'GET /v1/orders', requests: 10, errors: 1 },
    { day: '2026-09-19', endpoint: 'GET /v1/options', requests: 2, errors: 0 },
    { day: '2026-09-17', endpoint: 'GET /v1/orders', requests: 5, errors: 5 },
  ]

  test('fills every day in the range, oldest first', () => {
    const s = summarizeUsage(rows, 3, NOON)
    expect(s.daily).toEqual([
      { day: '2026-09-17', requests: 5, errors: 5 },
      { day: '2026-09-18', requests: 0, errors: 0 },
      { day: '2026-09-19', requests: 12, errors: 1 },
    ])
  })

  test('groups by endpoint, busiest first, and totals', () => {
    const s = summarizeUsage(rows, 3, NOON)
    expect(s.byEndpoint).toEqual([
      { endpoint: 'GET /v1/orders', requests: 15, errors: 6 },
      { endpoint: 'GET /v1/options', requests: 2, errors: 0 },
    ])
    expect(s.totals).toEqual({ requests: 17, errors: 6 })
  })

  test('ignores rows older than the range', () => {
    expect(summarizeUsage(rows, 1, NOON).totals).toEqual({ requests: 12, errors: 1 })
  })
})
