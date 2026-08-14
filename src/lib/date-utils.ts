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

  // Try D.M.YYYY pattern (covers DD.MM.YYYY, D.MM.YYYY, DD.M.YYYY, D.M.YYYY)
  const germanMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (germanMatch) {
    day = parseInt(germanMatch[1], 10)
    month = parseInt(germanMatch[2], 10)
    year = parseInt(germanMatch[3], 10)
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
      record[field] = normalizeDate(record[field])
    }
  }
  return data
}

// Re-export shared date utilities (canonical implementations)

export function parseGermanDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  // Use fixed reference date to avoid timezone issues around midnight
  const parsed = parse(dateStr, 'dd.MM.yyyy', new Date(2000, 0, 1))
  return isValid(parsed) ? parsed : null
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
