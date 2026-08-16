import type { Order } from './types'
import { parseGermanDate } from './date-utils'

/**
 * Days without a change after which an open order stops counting as an active
 * wait. Matches the archive feature's own default, so the site holds one idea
 * of "nobody is tending this any more" rather than two.
 */
export const STALE_AFTER_DAYS = 180

const DAY = 86_400_000

export function startOfToday(now: Date = new Date()): Date {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return today
}

/**
 * Whether the car is actually with its owner.
 *
 * A delivery date in the future is an appointment, not a handover. The order
 * status already draws that line — `delivered` against `delivery_scheduled` —
 * and the statistics did not: every date counted, so people still waiting were
 * reported as delivered and their wait measured to a day that had not happened.
 */
export function isHandedOver(
  order: Pick<Order, 'deliveryDate'>,
  today: Date = startOfToday(),
): boolean {
  const delivered = parseGermanDate(order.deliveryDate)
  return Boolean(delivered && delivered.getTime() <= today.getTime())
}

/**
 * Whether an order belongs in the public figures at all.
 *
 * Two flags take an order out: `cancelled`, set by its owner, and `archived`,
 * set by an admin. Archived orders were already hidden from the order list but
 * not from the statistics, and the list is where the statistics get their data —
 * so the averages quietly depended on who was asking. An admin loading the page
 * with archived orders included saw different numbers than everyone else.
 */
export function countsTowardStats(
  order: { cancelled?: boolean | null; archived?: boolean | null },
): boolean {
  return !order.cancelled && !order.archived
}

/**
 * An open order nobody has touched for a long time.
 *
 * The live data shows what these are: entries carried in when the database was
 * set up and never edited since — several already holding a VIN. Counting them
 * as people who are "still waiting" overstates the queue, and one of them, a
 * placeholder ordered on the first of January with no VIN, was setting the
 * longest-wait figure the front page leads with.
 *
 * Judged by the last edit rather than by the length of the wait: a two-year wait
 * whose owner keeps it current is exactly what this site exists to show.
 */
export function isStaleOpen(
  order: Pick<Order, 'deliveryDate' | 'updatedAt'>,
  today: Date = startOfToday(),
  thresholdDays: number = STALE_AFTER_DAYS,
): boolean {
  if (isHandedOver(order, today)) return false
  if (!order.updatedAt) return false

  const touched = new Date(order.updatedAt)
  if (Number.isNaN(touched.getTime())) return false

  return today.getTime() - touched.getTime() > thresholdDays * DAY
}
