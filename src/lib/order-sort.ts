import { parseGermanDate } from './date-utils'

export type SortDirection = 'asc' | 'desc'

/**
 * Compare two values where either may be absent, keeping absent ones last.
 *
 * The table had this rule written out at four call sites as
 * `direction === 'asc' ? 1 : -1`, which reverses with the sort direction. So
 * sorting by order date newest-first put every order *without* an order date at
 * the top, and the first screen of the table was nothing but "Kein Datum".
 *
 * Missing is not a value. It belongs at the end whichever way the column is
 * pointing, because the reader sorted the column to see the ones that have it.
 */
export function compareNullable(
  a: number | null,
  b: number | null,
  direction: SortDirection,
): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return direction === 'asc' ? a - b : b - a
}

/**
 * Compare two stored DD.MM.YYYY dates by the calendar.
 *
 * Anything that is not a readable date counts as missing. The table used to
 * parse these itself with a third copy of the logic that validated nothing:
 * it split on dots and fed the pieces to `new Date(year, month - 1, day)`, so
 * "1.1.26" became the year 26, and any value that produced an Invalid Date gave
 * the comparator a NaN to return — at which point Array.prototype.sort is free
 * to arrange the entire column however it likes.
 */
export function compareDateStrings(
  a: string | null,
  b: string | null,
  direction: SortDirection,
): number {
  const aDate = parseGermanDate(a)
  const bDate = parseGermanDate(b)
  return compareNullable(
    aDate ? aDate.getTime() : null,
    bDate ? bDate.getTime() : null,
    direction,
  )
}
