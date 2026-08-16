import { describe, test, expect } from 'vitest'
import { canClaimLegacyOrder } from './legacy-claim'

describe('canClaimLegacyOrder', () => {
  test('accepts the exact order name', () => {
    expect(canClaimLegacyOrder('sven.7687', 'sven.7687')).toBe(true)
  })

  test('ignores case and surrounding whitespace', () => {
    expect(canClaimLegacyOrder('  SVEN.7687 ', 'sven.7687')).toBe(true)
  })

  test('rejects a different name', () => {
    expect(canClaimLegacyOrder('someone.else', 'sven.7687')).toBe(false)
  })

  test('rejects a partial match', () => {
    // Substring acceptance would let one guess cover many orders at once.
    expect(canClaimLegacyOrder('sven', 'sven.7687')).toBe(false)
    expect(canClaimLegacyOrder('sven.7687.extra', 'sven.7687')).toBe(false)
  })

  test('rejects empty input even when the order name is empty', () => {
    expect(canClaimLegacyOrder('', '')).toBe(false)
    expect(canClaimLegacyOrder('   ', '')).toBe(false)
    expect(canClaimLegacyOrder('anything', '')).toBe(false)
  })

  test('rejects a missing claim value', () => {
    expect(canClaimLegacyOrder(undefined, 'sven.7687')).toBe(false)
    expect(canClaimLegacyOrder(null, 'sven.7687')).toBe(false)
  })
})
