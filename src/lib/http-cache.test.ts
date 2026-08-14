import { describe, test, expect } from 'vitest'
import { computeETag, isNotModified } from './http-cache'

describe('computeETag', () => {
  test('is stable for identical payloads', () => {
    const payload = [{ id: 'a', updatedAt: '2026-01-01T00:00:00.000Z' }]
    expect(computeETag(payload)).toBe(computeETag(payload))
  })

  test('changes when the payload changes', () => {
    const before = [{ id: 'a', vin: null }]
    const after = [{ id: 'a', vin: 'LRW1234' }]
    expect(computeETag(before)).not.toBe(computeETag(after))
  })

  test('is a quoted entity tag', () => {
    expect(computeETag([])).toMatch(/^"[a-f0-9]+"$/)
  })
})

describe('isNotModified', () => {
  test('matches an identical tag', () => {
    expect(isNotModified('"abc123"', '"abc123"')).toBe(true)
  })

  test('does not match a different tag', () => {
    expect(isNotModified('"abc123"', '"def456"')).toBe(false)
  })

  test('handles a missing request header', () => {
    expect(isNotModified(null, '"abc123"')).toBe(false)
  })

  test('matches when the client sends several tags', () => {
    expect(isNotModified('"old", "abc123"', '"abc123"')).toBe(true)
  })

  test('matches a weak validator against the same tag', () => {
    // Caddy and some CDNs downgrade entity tags to weak on the way through.
    expect(isNotModified('W/"abc123"', '"abc123"')).toBe(true)
  })

  test('treats the wildcard as a match', () => {
    expect(isNotModified('*', '"abc123"')).toBe(true)
  })
})
