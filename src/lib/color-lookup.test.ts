import { describe, test, expect } from 'vitest'
import { findColorInfo } from './color-lookup'

describe('findColorInfo', () => {
  test('resolves the stored internal value', () => {
    expect(findColorInfo('pearl_white')?.label).toBe('Pearl White')
  })

  test('resolves a display label', () => {
    expect(findColorInfo('Ultra Red')?.value).toBe('ultra_red')
  })

  test('ignores case and surrounding whitespace', () => {
    expect(findColorInfo('  SOLID BLACK ')?.value).toBe('solid_black')
  })

  test('resolves a label written with underscores', () => {
    expect(findColorInfo('deep_blue_metallic')?.value).toBe('deep_blue')
  })

  test('does not confuse two colours that share a word', () => {
    // The old substring matching accepted a hit whenever either string
    // contained the other, so "black" could resolve to Diamond Black and
    // "blue" to whichever blue happened to be iterated first.
    expect(findColorInfo('diamond_black')?.value).toBe('diamond_black')
    expect(findColorInfo('solid_black')?.value).toBe('solid_black')
    expect(findColorInfo('marine_blue')?.value).toBe('marine_blue')
    expect(findColorInfo('glacier_blue')?.value).toBe('glacier_blue')
  })

  test('returns null for an ambiguous fragment rather than guessing', () => {
    expect(findColorInfo('black')).toBeNull()
    expect(findColorInfo('blue')).toBeNull()
  })

  test('returns null for an unknown colour', () => {
    expect(findColorInfo('chartreuse')).toBeNull()
  })

  test('returns null for empty input', () => {
    expect(findColorInfo(null)).toBeNull()
    expect(findColorInfo('')).toBeNull()
    expect(findColorInfo('   ')).toBeNull()
  })
})
