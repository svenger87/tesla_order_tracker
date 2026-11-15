import { describe, it, expect } from 'vitest'
import {
  formatDeliveryWindow,
  parseDeliveryWindowRange,
  parseDeliveryWindowStart,
} from './delivery-window'

/** Shorthand: the parsed start as YYYY-MM-DD, or null. */
function start(window: string, orderDate: string | null = '01.06.2026'): string | null {
  const d = parseDeliveryWindowStart(window, orderDate)
  if (!d) return null
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

describe('parseDeliveryWindowStart — the shapes that are actually stored', () => {
  it('reads a full day-first range', () => {
    expect(start('17.10.2026 - 21.12.2026')).toBe('2026-10-17')
    expect(start('01.10.2026-31.11.2026')).toBe('2026-10-01')
  })

  it('takes the year from the end when the start omits it', () => {
    // The commonest shape in the data by far.
    expect(start('17.09. - 30.09.2026')).toBe('2026-09-17')
    expect(start('25.09.-30.09.2026')).toBe('2026-09-25')
    expect(start('29.08-20.09.2026')).toBe('2026-08-29')
  })

  it('reads month names, in whichever language the owner saw them', () => {
    expect(start('19 September - 30 September')).toBe('2026-09-19')
    expect(start('22 Augustus - 1 September')).toBe('2026-08-22')
    expect(start('7 septembre - 30 septembre')).toBe('2026-09-07')
  })

  it('reads a month-only window as its first day', () => {
    expect(start('Nov - Dez 2026')).toBe('2026-11-01')
    expect(start('November 2026')).toBe('2026-11-01')
    expect(start('juil. - août 2026')).toBe('2026-07-01')
  })

  it('reads slashes as day-first, like everything else here', () => {
    expect(start('04/10-08/12/2026')).toBe('2026-10-04')
  })
})

describe('parseDeliveryWindowStart — the year when the text has none', () => {
  it('takes the first year that puts the window after the order', () => {
    // "29.08. - 20.09." on an order placed in June 2026 is that August.
    expect(start('29.08. - 20.09.', '01.06.2026')).toBe('2026-08-29')
  })

  it('rolls into the next year when the month has already passed', () => {
    // Ordered in November, window says January: that is the January after.
    expect(start('15.01. - 20.01.', '10.11.2026')).toBe('2027-01-15')
  })

  it('gives up when there is no order date to anchor to', () => {
    expect(start('29.08. - 20.09.', null)).toBeNull()
  })
})

describe('parseDeliveryWindowStart — what it refuses', () => {
  it('reads a range that can only be month-first, month-first', () => {
    // "08/22" has a 22nd month under day-first, so this row is US notation and
    // starts on 22 August. Nothing is guessed: the other reading is impossible.
    expect(start('08/22-09/23-2026')).toBe('2026-08-22')
  })

  it('refuses free text somebody typed into the field', () => {
    // Both of these are in the live data.
    expect(start('GrosserMeister')).toBeNull()
    expect(start('Wide')).toBeNull()
  })

  it('refuses an empty or missing window', () => {
    expect(start('')).toBeNull()
    expect(parseDeliveryWindowStart(null, '01.06.2026')).toBeNull()
  })

  it('refuses a day the calendar does not have', () => {
    expect(start('31.02.2026 - 05.03.2026')).toBeNull()
  })
})

describe('parseDeliveryWindowStart — shapes where the parts share a month', () => {
  it('reads a start day that borrows the month and year written after it', () => {
    expect(start('03.-30.09.2026')).toBe('2026-09-03')
    expect(start('26-30.09.', '06.08.2026')).toBe('2026-09-26')
  })
})

describe('parseDeliveryWindowStart — month-and-year windows', () => {
  it('reads a month with a four-digit year', () => {
    expect(start('09/2026')).toBe('2026-09-01')
    expect(start('01/2027-02/2027')).toBe('2027-01-01')
  })

  it('reads a month with a two-digit year', () => {
    // "11.26" cannot be day-and-month, because there is no 26th month — so the
    // second part is the year, and this is November 2026.
    expect(start('11.26 -12.26')).toBe('2026-11-01')
  })

  it('does not read a month-first range as a short year', () => {
    expect(start('08/22-09/23-2026')).toBe('2026-08-22')
  })
})

describe('parseDeliveryWindowStart — working out which convention a row used', () => {
  it('reads month-first when day-first is impossible somewhere in the string', () => {
    // "09/30" has no 30th month, so this row is month-first throughout, and its
    // start is 1 September. Read day-first it became the 9th of January — four
    // months before the order it belongs to.
    expect(start('09/01-09/30/2026')).toBe('2026-09-01')
    expect(start('11/01-12/31/2026')).toBe('2026-11-01')
  })

  it('reads day-first when month-first is impossible somewhere', () => {
    expect(start('17.09. - 30.09.2026')).toBe('2026-09-17')
  })

  it('falls back to the order date when both conventions fit', () => {
    // "04/10-08/12/2026" is 4 October or 10 April. Only one of those follows an
    // order placed in June, and a window cannot precede its own order.
    expect(start('04/10-08/12/2026', '01.06.2026')).toBe('2026-10-04')
  })

  it('refuses when both readings still fit after that', () => {
    expect(start('04/10-08/12/2026', '01.01.2026')).toBeNull()
  })

  it('does not mistake a day for a two-digit year', () => {
    // "07/13" is 13 July written month-first, not July 2013. The year, when it
    // is written as two digits, still has to be a year this data could contain.
    expect(start('07/13-08/04', '08.06.2026')).toBe('2026-07-13')
    expect(start('06/17-06/24', '28.04.2026')).toBe('2026-06-17')
  })
})

describe('parseDeliveryWindowStart — the separator says which world a value comes from', () => {
  it('reads dotted dates day-first even when both readings would fit', () => {
    // 12.08.2026 is the 12th of August everywhere dots are used for dates. Only
    // the slash form is genuinely contested.
    expect(start('12.08.2026 - 11.09.2026')).toBe('2026-08-12')
    expect(start('12.10.-11.11.2026')).toBe('2026-10-12')
    expect(start('04.09.-11.09.', '01.06.2026')).toBe('2026-09-04')
  })

  it('still lets an impossible month override the separator', () => {
    expect(start('05.30.2026 - 06.15.2026')).toBe('2026-05-30')
  })
})

describe('parseDeliveryWindowStart — the canonical format the form writes', () => {
  it('reads a same-year window, year written once at the end', () => {
    expect(start('11.02.-18.02.2026', '01.01.2026')).toBe('2026-02-11')
    expect(start('13.12.-31.12.2026')).toBe('2026-12-13')
  })

  it('reads a window that crosses into the next year', () => {
    expect(start('28.12.2026-05.01.2027')).toBe('2026-12-28')
  })
})

/** Shorthand: the parsed range as "YYYY-MM-DD..YYYY-MM-DD", or null. */
function range(window: string, orderDate: string | null = '01.06.2026'): string | null {
  const r = parseDeliveryWindowRange(window, orderDate)
  if (!r) return null
  const p = (n: number) => String(n).padStart(2, '0')
  const iso = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  return `${iso(r.start)}..${iso(r.end)}`
}

describe('parseDeliveryWindowRange', () => {
  it('reads both canonical shapes', () => {
    expect(range('11.02.-18.02.2026', '01.01.2026')).toBe('2026-02-11..2026-02-18')
    expect(range('28.12.2026-05.01.2027')).toBe('2026-12-28..2027-01-05')
  })

  it('reads the other day-precise shapes in the live data', () => {
    expect(range('13.12.-31.12.2026')).toBe('2026-12-13..2026-12-31')
    expect(range('17.10.2026 - 21.12.2026')).toBe('2026-10-17..2026-12-21')
    expect(range('03.-30.09.2026')).toBe('2026-09-03..2026-09-30')
    expect(range('29.08-20.09.2026')).toBe('2026-08-29..2026-09-20')
    expect(range('09/01-09/30/2026')).toBe('2026-09-01..2026-09-30')
  })

  it('places year-less windows after the order', () => {
    expect(range('03.12.-31.12.', '10.11.2026')).toBe('2026-12-03..2026-12-31')
    expect(range('22 Dezember - 29 Dezember', '10.11.2026')).toBe('2026-12-22..2026-12-29')
  })

  it('rolls a year-less end into the next year when it falls before the start', () => {
    expect(range('22 Dezember - 5 Januar', '10.11.2026')).toBe('2026-12-22..2027-01-05')
  })

  it('refuses windows it cannot read to the day', () => {
    expect(range('November 2026')).toBeNull()
    expect(range('Nov - Dez 2026')).toBeNull()
    expect(range('01/2027-02/2027')).toBeNull()
    expect(range('17.10.2026')).toBeNull()
    expect(range('GrosserMeister')).toBeNull()
    expect(range('')).toBeNull()
  })

  it('refuses an end before its start', () => {
    // Live value: the end lies a day before the start.
    expect(range('01/02/2027 - 31/01/2027')).toBeNull()
  })

  it('refuses a year-less window without an order date to anchor it', () => {
    expect(range('03.12.-31.12.', null)).toBeNull()
  })

  it('refuses when the convention stays ambiguous', () => {
    expect(range('04/10-08/12/2026', '01.01.2026')).toBeNull()
    expect(range('04/10-08/12/2026', '01.06.2026')).toBe('2026-10-04..2026-12-08')
  })
})

describe('formatDeliveryWindow', () => {
  it('writes the year once when both ends share it', () => {
    expect(formatDeliveryWindow(new Date(2026, 1, 11), new Date(2026, 1, 18))).toBe('11.02.-18.02.2026')
  })

  it('writes both years when the window crosses one', () => {
    expect(formatDeliveryWindow(new Date(2026, 11, 28), new Date(2027, 0, 5))).toBe('28.12.2026-05.01.2027')
  })

  it('round-trips through the range parser', () => {
    for (const [a, b] of [
      [new Date(2026, 8, 1), new Date(2026, 8, 30)],
      [new Date(2026, 11, 28), new Date(2027, 0, 5)],
      [new Date(2026, 9, 4), new Date(2026, 9, 4)],
    ] as const) {
      const r = parseDeliveryWindowRange(formatDeliveryWindow(a, b), null)
      expect(r?.start.getTime()).toBe(a.getTime())
      expect(r?.end.getTime()).toBe(b.getTime())
    }
  })
})
