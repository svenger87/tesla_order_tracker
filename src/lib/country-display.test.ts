import { describe, it, expect } from 'vitest'
import { flagFromCode, countryNameFromCode } from './country-display'

describe('flagFromCode', () => {
  it('builds the flag for a country nobody added to the options', () => {
    // us, ca and tw are in the live data and in nobody's option list, so they
    // showed up as a bare "us" with no flag beside every other country's.
    expect(flagFromCode('us')).toBe('🇺🇸')
    expect(flagFromCode('ca')).toBe('🇨🇦')
    expect(flagFromCode('tw')).toBe('🇹🇼')
  })

  it('reads a code in any case', () => {
    expect(flagFromCode('DE')).toBe('🇩🇪')
    expect(flagFromCode(' de ')).toBe('🇩🇪')
  })

  it('knows that this app writes uk where the standard writes gb', () => {
    // The internal code is uk, but Unicode has no UK flag — only GB. Left
    // unmapped it produces a pair of letters no font draws as a flag.
    expect(flagFromCode('uk')).toBe(flagFromCode('gb'))
    expect(flagFromCode('uk')).toBe('🇬🇧')
  })

  it('refuses anything that is not a country code', () => {
    expect(flagFromCode('')).toBeNull()
    expect(flagFromCode('deu')).toBeNull()
    expect(flagFromCode('d')).toBeNull()
    expect(flagFromCode('12')).toBeNull()
    expect(flagFromCode(null)).toBeNull()
    expect(flagFromCode('unknown')).toBeNull()
  })
})

describe('countryNameFromCode', () => {
  it('names a country in the reader\'s language', () => {
    expect(countryNameFromCode('us', 'de')).toBe('Vereinigte Staaten')
    expect(countryNameFromCode('us', 'en')).toBe('United States')
    expect(countryNameFromCode('ca', 'fr')).toBe('Canada')
  })

  it('maps this app\'s uk to the standard gb before asking', () => {
    expect(countryNameFromCode('uk', 'de')).toBe('Vereinigtes Königreich')
  })

  it('gives nothing back rather than echoing the input', () => {
    // Left to its default, Intl answers a region it does not know with the code
    // it was handed, which would read as a country name on screen. "zz" is not
    // the case to test with — it is a real CLDR code meaning "unknown region",
    // and its name is a better label than the two letters would be.
    expect(countryNameFromCode('qx', 'de')).toBeNull()
    expect(countryNameFromCode('zz', 'de')).toBe('Unbekannte Region')
    expect(countryNameFromCode('', 'de')).toBeNull()
    expect(countryNameFromCode('deu', 'de')).toBeNull()
  })
})
