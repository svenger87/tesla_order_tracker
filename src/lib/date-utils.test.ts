import { describe, test, expect } from 'vitest'
import { normalizeDate, findDateSequenceError } from './date-utils'

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

  test('still rejects what is not a date', () => {
    expect(normalizeDate('12.')).toBeNull()
    expect(normalizeDate('27/03/26')).toBeNull()
    expect(normalizeDate('2703202')).toBeNull()
    expect(normalizeDate('32/01/2026')).toBeNull()
    expect(normalizeDate('17/13/2026')).toBeNull()
  })

  test('applies the same calendar check as the dot format', () => {
    expect(normalizeDate('31/02/2027')).toBeNull()
    expect(normalizeDate('29/02/2028')).toBe('29.02.2028')
  })
})
