import { describe, test, expect, it } from 'vitest'
import { normalizeDate, findDateSequenceError, parseGermanDate } from './date-utils'

describe('normalizeDate', () => {
  test('accepts a valid German date', () => {
    expect(normalizeDate('5.3.2026')).toBe('05.03.2026')
  })

  test('accepts an ISO date', () => {
    expect(normalizeDate('2026-03-05')).toBe('05.03.2026')
  })

  test('rejects a day that does not exist in that month', () => {
    expect(normalizeDate('31.02.2027')).toBeNull()
  })

  test('rejects 29 February in a non-leap year', () => {
    expect(normalizeDate('29.02.2027')).toBeNull()
  })

  test('accepts 29 February in a leap year', () => {
    expect(normalizeDate('29.02.2028')).toBe('29.02.2028')
  })

  test('accepts dates beyond the year 2030', () => {
    // The old hardcoded 2020–2030 window silently dropped valid future dates.
    const year = new Date().getFullYear() + 6
    expect(normalizeDate(`01.06.${year}`)).toBe(`01.06.${year}`)
  })

  test('rejects implausibly old years', () => {
    expect(normalizeDate('01.06.1999')).toBeNull()
  })
})

describe('findDateSequenceError', () => {
  test('accepts a plausible chronology', () => {
    expect(findDateSequenceError({
      orderDate: '01.01.2026',
      productionDate: '01.03.2026',
      vinReceivedDate: '15.02.2026',
      papersReceivedDate: '10.03.2026',
      deliveryDate: '20.03.2026',
    })).toBeNull()
  })

  test('rejects production before the order', () => {
    expect(findDateSequenceError({
      orderDate: '01.03.2026',
      productionDate: '01.01.2026',
    })).toBe('PRODUCTION_BEFORE_ORDER')
  })

  test('rejects delivery before the order', () => {
    expect(findDateSequenceError({
      orderDate: '01.03.2026',
      deliveryDate: '01.01.2026',
    })).toBe('DELIVERY_BEFORE_ORDER')
  })

  test('rejects an order date in the future', () => {
    const nextYear = new Date().getFullYear() + 1
    expect(findDateSequenceError({ orderDate: `01.06.${nextYear}` })).toBe('ORDER_DATE_IN_FUTURE')
  })

  test('allows a delivery date in the future', () => {
    // Planned deliveries are the normal case and must stay valid.
    const nextYear = new Date().getFullYear() + 1
    expect(findDateSequenceError({
      orderDate: '01.01.2026',
      deliveryDate: `01.06.${nextYear}`,
    })).toBeNull()
  })

  test('ignores fields that are absent', () => {
    expect(findDateSequenceError({})).toBeNull()
  })
})

describe('normalizeDate — formats the TOST sync actually sends', () => {
  // These are not hypothetical: the four unparseable order dates sitting in
  // production read 17/04/2026, 21/01/2026, 27032026 and "12.". Anything the
  // normalizer does not recognise is set to null, so a date arriving in one of
  // these shapes was thrown away and the order landed without one.
  test('accepts slashes', () => {
    expect(normalizeDate('17/04/2026')).toBe('17.04.2026')
    expect(normalizeDate('21/01/2026')).toBe('21.01.2026')
    expect(normalizeDate('5/3/2026')).toBe('05.03.2026')
  })

  test('accepts a compact date with no separators', () => {
    expect(normalizeDate('27032026')).toBe('27.03.2026')
  })

  test('reads day first, as every other format here does', () => {
    // Both live examples put a number above twelve first, so day-first is what
    // the sender means. A German tool feeding a German-first site would be an
    // odd place for month-first.
    expect(normalizeDate('17/04/2026')).toBe('17.04.2026')
  })

  test('reads a short year in the slash form too', () => {
    // This used to be listed below as "not a date". It is one — 27.03.2026 —
    // and treating it as junk stored nothing at all.
    expect(normalizeDate('27/03/26')).toBe('27.03.2026')
  })

  test('still rejects what is not a date', () => {
    expect(normalizeDate('12.')).toBeNull()
    expect(normalizeDate('2703202')).toBeNull()
    expect(normalizeDate('32/01/2026')).toBeNull()
    expect(normalizeDate('17/13/2026')).toBeNull()
  })

  test('applies the same calendar check as the dot format', () => {
    expect(normalizeDate('31/02/2027')).toBeNull()
    expect(normalizeDate('29/02/2028')).toBe('29.02.2028')
  })
})

describe('parseGermanDate — the year has to be plausible', () => {
  it('reads an ordinary date', () => {
    expect(parseGermanDate('15.08.2026')?.getFullYear()).toBe(2026)
  })

  it('rejects a two-digit year instead of guessing the century', () => {
    // "1.1.26" was read as the year 26 AD, which made one order's VIN-to-
    // production span 730490 days and dragged that average from 8 days to 865.
    expect(parseGermanDate('1.1.26')).toBeNull()
    expect(parseGermanDate('11.12.25')).toBeNull()
  })

  it('rejects a year that is a typo', () => {
    // 26.08.0205 is 26.08.2025 with a slipped digit. Read literally it put a
    // production date in the third century and made one segment average 1019.
    expect(parseGermanDate('26.08.0205')).toBeNull()
  })

  it('accepts dates across the whole window the app works in', () => {
    const year = new Date().getFullYear()
    expect(parseGermanDate(`01.03.${year + 5}`)).not.toBeNull()
    expect(parseGermanDate(`01.03.${year - 5}`)).not.toBeNull()
  })
})

describe('normalizeDate — two-digit years', () => {
  it('reads a two-digit year as this century', () => {
    // Both live examples confirm the reading: Silithium ordered 13.11.2025 and
    // has a VIN date of 11.12.25, Andre74 ordered 16.11.2025 and has 1.1.26
    // with production on 06.01.2026. Discarding them stored nothing at all.
    expect(normalizeDate('11.12.25')).toBe('11.12.2025')
    expect(normalizeDate('1.1.26')).toBe('01.01.2026')
  })

  it('still applies the plausibility window to the expanded year', () => {
    expect(normalizeDate('01.01.99')).toBeNull()
  })

  it('does not treat a four-digit year as if it were short', () => {
    // 26.08.0205 is 26.08.2025 with a slipped digit, but adding 2000 gives
    // 2205, which is not a repair — it is a different wrong answer. Input
    // refuses it; the repair script resolves it from the order's own timeline.
    expect(normalizeDate('26.08.0205')).toBeNull()
  })
})
