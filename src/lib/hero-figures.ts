import type { Order } from './types'
import { parseGermanDate } from './date-utils'

export interface HeroFigures {
  /** Orders that count — cancelled ones are excluded from every figure here. */
  total: number
  delivered: number
  /** Waiting, and a VIN has been assigned. */
  waitingWithVin: number
  /** Waiting, still without a VIN. */
  waitingWithoutVin: number
  /**
   * Median rather than mean. Wait times are skewed — a handful of orders that
   * have been open for over a year would pull an average away from anything a
   * reader recognises as their own situation.
   */
  medianWaitDays: number | null
  /** Longest still-open wait, counted to today. */
  longestOpenWaitDays: number | null
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
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
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const waits: number[] = []
  const openWaits: number[] = []
  let delivered = 0
  let waitingWithVin = 0
  let waitingWithoutVin = 0

  for (const o of live) {
    const ordered = parseGermanDate(o.orderDate)
    const handedOver = parseGermanDate(o.deliveryDate)

    if (handedOver) {
      delivered++
      if (ordered) waits.push(daysBetween(ordered, handedOver))
      continue
    }

    if (o.vin) waitingWithVin++
    else waitingWithoutVin++
    if (ordered) openWaits.push(daysBetween(ordered, today))
  }

  return {
    total: live.length,
    delivered,
    waitingWithVin,
    waitingWithoutVin,
    medianWaitDays: median(waits),
    longestOpenWaitDays: openWaits.length > 0 ? Math.max(...openWaits) : null,
  }
}
