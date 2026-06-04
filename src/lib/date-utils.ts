import { parse, differenceInDays, isValid } from 'date-fns'

/**
 * Normalize a date string to DD.MM.YYYY format.
 * Accepts D.M.YYYY (with or without leading zeros) and YYYY-MM-DD (ISO).
 * Returns null for invalid, empty, or out-of-range dates.
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

  // Validate ranges
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2020 || year > 2030) {
    return null
  }

  // Return normalized DD.MM.YYYY
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`
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
