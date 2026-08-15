import { parse, differenceInDays, isValid } from 'date-fns'

/** Orders older than this many years are treated as data errors, not history. */
const MAX_YEARS_PAST = 6
/** Delivery windows reach into the future, but not arbitrarily far. */
const MAX_YEARS_FUTURE = 6

/**
 * Normalize a date string to DD.MM.YYYY format.
 * Accepts D.M.YYYY (with or without leading zeros) and YYYY-MM-DD (ISO).
 * Returns null for invalid, empty, or out-of-range dates.
 *
 * The calendar check matters because these fields are community-editable and
 * feed the public wait-time statistics: a plain range check lets 31.02. through,
 * which then parses as null downstream and silently drops the order from every
 * average it should have been part of.
 */
export function normalizeDate(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  let day: number, month: number, year: number

  // Try D.M.YYYY and D/M/YYYY. The slash form is here because the sync sends
  // it: four order dates reached production unparsed, two of them 17/04/2026
  // and 21/01/2026. Anything this function does not recognise becomes null, so
  // those arrived as a date and were stored as nothing.
  //
  // Read day first. Both live examples put a number above twelve in front, so
  // that is what the sender means, and it matches every other format here.
  const germanMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/)
  const compactMatch = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/)
  if (germanMatch) {
    day = parseInt(germanMatch[1], 10)
    month = parseInt(germanMatch[2], 10)
    year = parseInt(germanMatch[3], 10)
    // A two-digit year means this century. Both live examples confirm it:
    // 11.12.25 on an order placed 13.11.2025, and 1.1.26 on one whose car went
    // into production on 06.01.2026. They used to be discarded outright, so the
    // date somebody sent was stored as nothing. The window below still applies
    // to the result, so an implausible expansion is still refused.
    if (germanMatch[3].length === 2) year += 2000
  } else if (compactMatch) {
    // DDMMYYYY, no separators — 27032026 is in the data too.
    day = parseInt(compactMatch[1], 10)
    month = parseInt(compactMatch[2], 10)
    year = parseInt(compactMatch[3], 10)
  } else {
    // Try ISO YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10)
      month = parseInt(isoMatch[2], 10)
      day = parseInt(isoMatch[3], 10)
    } else {
      return null
    }
  }

  // Validate ranges, relative to today so the window never expires
  const currentYear = new Date().getFullYear()
  if (
    day < 1 || day > 31 ||
    month < 1 || month > 12 ||
    year < currentYear - MAX_YEARS_PAST ||
    year > currentYear + MAX_YEARS_FUTURE
  ) {
    return null
  }

  // Calendar validity: rejects 31.02., 29.02. in non-leap years, 31.04., …
  const asDate = new Date(year, month - 1, day)
  if (
    asDate.getFullYear() !== year ||
    asDate.getMonth() !== month - 1 ||
    asDate.getDate() !== day
  ) {
    return null
  }

  // Return normalized DD.MM.YYYY
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`
}

/** Milestones in the order a vehicle actually passes through them. */
const DATE_SEQUENCE = [
  { field: 'orderDate', code: 'ORDER' },
  { field: 'productionDate', code: 'PRODUCTION' },
  { field: 'papersReceivedDate', code: 'PAPERS' },
  { field: 'deliveryDate', code: 'DELIVERY' },
] as const

/**
 * Check a set of date fields for chronological plausibility.
 * Returns an error code, or null when the dates are consistent.
 *
 * `vinReceivedDate` is deliberately excluded from the ordering check — a VIN is
 * regularly assigned after production has already started, so it has no fixed
 * position in the chain. Future dates are allowed for everything except the
 * order date, because planned deliveries are the normal case.
 */
export function findDateSequenceError(
  data: Record<string, unknown>,
): string | null {
  const parsed = DATE_SEQUENCE.map(({ field, code }) => ({
    code,
    date: typeof data[field] === 'string' ? parseGermanDate(data[field] as string) : null,
  }))

  const order = parsed[0].date
  if (order) {
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)
    if (order.getTime() > endOfToday.getTime()) return 'ORDER_DATE_IN_FUTURE'
  }

  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const earlier = parsed[i]
      const later = parsed[j]
      if (!earlier.date || !later.date) continue
      if (later.date.getTime() < earlier.date.getTime()) {
        return `${later.code}_BEFORE_${earlier.code}`
      }
    }
  }

  return null
}

const DATE_FIELDS = [
  'orderDate', 'vinReceivedDate', 'papersReceivedDate',
  'productionDate', 'deliveryDate',
] as const

/**
 * Normalize all date fields on an object in-place and return it.
 */
export function normalizeDateFields<T extends object>(data: T): T {
  const record = data as Record<string, unknown>
  for (const field of DATE_FIELDS) {
    if (field in record && typeof record[field] === 'string') {
      const raw = record[field] as string
      const normalized = normalizeDate(raw)

      // A value that arrived and could not be read is worth a line in the log.
      // Silently turning it into null is how 41 synced orders ended up without
      // an order date and nobody knew a date had been sent at all.
      if (raw.trim() && normalized === null) {
        console.warn(`Discarded unreadable ${field}: ${JSON.stringify(raw)}`)
      }

      record[field] = normalized
    }
  }
  return data
}

// Re-export shared date utilities (canonical implementations)

/**
 * Read a stored DD.MM.YYYY date, or null if it cannot be one.
 *
 * The year window matters as much as the format. date-fns will happily read
 * "1.1.26" as the year 26 and "26.08.0205" as the third century, and both of
 * those are in the live data — a two-digit year somebody typed, and 26.08.2025
 * with a slipped digit. Each is a single record, and each was enough on its own
 * to move a pipeline average by two orders of magnitude: VIN to production went
 * from 8 days to 865, production to papers from 7 to 1019.
 *
 * The same window normalizeDate enforces on input, applied to values that were
 * stored before it did. It moves with the current year, so it cannot expire.
 */
export function parseGermanDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  // Use fixed reference date to avoid timezone issues around midnight
  const parsed = parse(dateStr, 'dd.MM.yyyy', new Date(2000, 0, 1))
  if (!isValid(parsed)) return null

  const currentYear = new Date().getFullYear()
  const year = parsed.getFullYear()
  if (year < currentYear - MAX_YEARS_PAST || year > currentYear + MAX_YEARS_FUTURE) {
    return null
  }

  return parsed
}

export function calculateDaysBetween(
  fromDate: string | null | undefined,
  toDate: string | null | undefined
): number | null {
  const from = parseGermanDate(fromDate)
  const to = parseGermanDate(toDate)
  if (!from || !to) return null
  return differenceInDays(to, from)
}

export function calculateTimePeriods(data: {
  orderDate?: string | null
  productionDate?: string | null
  vinReceivedDate?: string | null
  deliveryDate?: string | null
  papersReceivedDate?: string | null
}) {
  return {
    orderToProduction: calculateDaysBetween(data.orderDate, data.productionDate),
    orderToVin: calculateDaysBetween(data.orderDate, data.vinReceivedDate),
    orderToDelivery: calculateDaysBetween(data.orderDate, data.deliveryDate),
    orderToPapers: calculateDaysBetween(data.orderDate, data.papersReceivedDate),
    papersToDelivery: calculateDaysBetween(data.papersReceivedDate, data.deliveryDate),
  }
}
