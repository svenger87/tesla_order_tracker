import { describe, test, expect } from 'vitest'
import { normalizeCountryCode } from './country-code'

describe('normalizeCountryCode', () => {
  test('maps the alias the sync sends to the code this app uses', () => {
    // Live split: 16 orders carry uk, all from the web form, and 13 carry gb,
    // all from the sync. The United Kingdom therefore appeared twice in the
    // country statistics, and no duplicate check could ever match across it.
    expect(normalizeCountryCode('gb')).toBe('uk')
    expect(normalizeCountryCode('GB')).toBe('uk')
  })

  test('leaves a code the app already knows alone', () => {
    expect(normalizeCountryCode('de')).toBe('de')
    expect(normalizeCountryCode('uk')).toBe('uk')
    expect(normalizeCountryCode('us')).toBe('us')
  })

  test('lowercases and trims', () => {
    expect(normalizeCountryCode(' DE ')).toBe('de')
  })

  test('passes through a code it has no opinion about', () => {
    // Better an unknown code than a dropped one: the order still belongs
    // somewhere, and a wrong guess is worse than an honest passthrough.
    expect(normalizeCountryCode('xx')).toBe('xx')
  })

  test('handles nothing at all', () => {
    expect(normalizeCountryCode(null)).toBeNull()
    expect(normalizeCountryCode(undefined)).toBeNull()
    expect(normalizeCountryCode('')).toBeNull()
    expect(normalizeCountryCode('   ')).toBeNull()
  })
})
