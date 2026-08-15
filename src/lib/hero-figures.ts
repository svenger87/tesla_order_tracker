import type { Order } from './types'
import { parseGermanDate } from './date-utils'
import { isHandedOver, isStaleOpen, startOfToday } from './order-state'

export interface HeroFigures {
  /** Orders that count — cancelled ones are excluded from every figure here. */
  total: number
  /** Handed over. An appointment still to come does not count. */
  delivered: number
  /** Waiting, a VIN has been assigned, and the entry is being kept current. */
  waitingWithVin: number
  /** Waiting without a VIN, and being kept current. */
  waitingWithoutVin: number
  /**
   * Open orders nobody has touched in months. Counted, but kept out of the
   * waiting figures and the longest wait — see isStaleOpen for why.
   */
  stale: number
  /**
   * Median rather than mean. Wait times are skewed — a handful of orders that
   * have been open for over a year would pull an average away from anything a
   * reader recognises as their own situation.
   */
  medianWaitDays: number | null
  /** Longest still-open wait, counted to today. Includes any single outlier. */
  longestOpenWaitDays: number | null
  /**
   * What the people at the top of the queue are waiting, as the 99th
   * percentile rather than the maximum.
   *
   * The front page leads with this, and a maximum hands that sentence to
   * whichever single record is most extreme. On the live data that was one
   * entry claiming 957 days — against 440 for the next longest and 260 at the
   * 99.5th percentile — so the page told every visitor about a wait that one
   * questionable row asserted.
   */
  longOpenWaitDays: number | null
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

/**
 * Nearest-rank percentile: the value at or below which the given share of the
 * sample falls. Used instead of a maximum where one row must not speak for
 * everyone.
 */
function percentile(values: number[], share: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(share * sorted.length) - 1)
  return sorted[Math.max(0, index)]
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

/**
 * The handful of numbers the page leads with.
 *
 * Deliberately separate from calculateStatistics(): that runs over the filtered
 * set for the dashboard, while these describe the whole community and have to
 * stay put when someone narrows the table to one country.
 */
export function getHeroFigures(orders: Order[]): HeroFigures {
  const live = orders.filter(o => !o.cancelled)
  const today = startOfToday()

  const waits: number[] = []
  const openWaits: number[] = []
  let delivered = 0
  let waitingWithVin = 0
  let waitingWithoutVin = 0
  let stale = 0

  for (const o of live) {
    const ordered = parseGermanDate(o.orderDate)

    if (isHandedOver(o, today)) {
      delivered++
      const handedOver = parseGermanDate(o.deliveryDate)
      if (ordered && handedOver) waits.push(daysBetween(ordered, handedOver))
      continue
    }

    // Left the waiting figures on purpose: the page says these people are still
    // waiting, and for an entry untouched since the database was set up that is
    // a claim about someone who stopped answering, not a queue.
    if (isStaleOpen(o, today)) {
      stale++
      continue
    }

    if (o.vin) waitingWithVin++
    else waitingWithoutVin++
    if (ordered) openWaits.push(daysBetween(ordered, today))
  }

  return {
    // Every live order, stale ones included: how many entries exist is a fact,
    // and shrinking it would trade one wrong number for another.
    total: live.length,
    delivered,
    waitingWithVin,
    waitingWithoutVin,
    stale,
    medianWaitDays: median(waits),
    longestOpenWaitDays: openWaits.length > 0 ? Math.max(...openWaits) : null,
    longOpenWaitDays: percentile(openWaits, 0.99),
  }
}
