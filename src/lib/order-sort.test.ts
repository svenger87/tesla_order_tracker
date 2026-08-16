import { describe, it, expect } from 'vitest'
import { compareNullable, compareDateStrings } from './order-sort'

describe('compareNullable', () => {
  it('orders ascending', () => {
    expect(compareNullable(1, 2, 'asc')).toBeLessThan(0)
  })

  it('orders descending', () => {
    expect(compareNullable(1, 2, 'desc')).toBeGreaterThan(0)
  })

  it('puts a missing value last when ascending', () => {
    expect(compareNullable(null, 2, 'asc')).toBeGreaterThan(0)
    expect(compareNullable(1, null, 'asc')).toBeLessThan(0)
  })

  it('puts a missing value last when descending too', () => {
    // The old rule flipped with the direction, so sorting newest-first put every
    // order without a date at the top — the first screen of the table was
    // nothing but "Kein Datum".
    expect(compareNullable(null, 2, 'desc')).toBeGreaterThan(0)
    expect(compareNullable(1, null, 'desc')).toBeLessThan(0)
  })

  it('treats two missing values as equal', () => {
    expect(compareNullable(null, null, 'asc')).toBe(0)
    expect(compareNullable(null, null, 'desc')).toBe(0)
  })
})

describe('compareDateStrings', () => {
  it('compares by calendar order, not by text', () => {
    // Read as text, "29.06.2026" sorts after "04.07.2026" because 2 beats 0.
    expect(compareDateStrings('04.07.2026', '29.06.2026', 'asc')).toBeGreaterThan(0)
  })

  it('sorts newest first when descending', () => {
    expect(compareDateStrings('04.07.2026', '29.06.2026', 'desc')).toBeLessThan(0)
  })

  it('treats an unreadable date as missing rather than as a number', () => {
    // "12." is in the live data. The table's own parser split it, got two parts,
    // and returned null — but "1.1.26" it turned into the year 26, and anything
    // that produced an Invalid Date made the comparator return NaN, which leaves
    // Array.prototype.sort free to do whatever it likes with the whole column.
    expect(compareDateStrings('12.', '29.06.2026', 'desc')).toBeGreaterThan(0)
    expect(compareDateStrings('1.1.26', '29.06.2026', 'desc')).toBeGreaterThan(0)
    expect(compareDateStrings('26.08.0205', '29.06.2026', 'desc')).toBeGreaterThan(0)
  })

  it('never returns NaN', () => {
    for (const pair of [['a.b.c', '01.01.2026'], ['', '01.01.2026'], ['31.02.2026', '01.01.2026']]) {
      expect(Number.isNaN(compareDateStrings(pair[0], pair[1], 'asc'))).toBe(false)
      expect(Number.isNaN(compareDateStrings(pair[0], pair[1], 'desc'))).toBe(false)
    }
  })
})
