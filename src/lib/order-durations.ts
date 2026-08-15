import { calculateTimePeriods } from './date-utils'

type DatedRecord = {
  orderDate?: string | null
  productionDate?: string | null
  vinReceivedDate?: string | null
  papersReceivedDate?: string | null
  deliveryDate?: string | null
}

/**
 * Recompute the five stored duration columns from the record's own dates.
 *
 * The columns exist so a list can be sorted without parsing dates, which means
 * they are a copy of something and can disagree with it. They did: the sync
 * normalized each incoming date but took the durations straight from the
 * spreadsheet, so a date this app refused to read became null while the number
 * the spreadsheet had computed from that same unread value was stored as fact.
 * One order ended up claiming a wait of -477253 days beside an empty order date.
 *
 * Deriving them here makes the dates the single source of truth: a duration can
 * only exist if both of its endpoints do.
 */
export function withDerivedDurations<T extends DatedRecord>(data: T) {
  return { ...data, ...calculateTimePeriods(data) }
}
