import type { Order } from './types'
import { parseGermanDate } from './date-utils'

export interface WaitComparison {
  /** Days from ordering to handover, or to today while still waiting. */
  waitedDays: number
  isDelivered: boolean
  /** Median wait of comparable delivered orders, or null if none exist. */
  comparableMedian: number | null
  /** Own wait minus the comparable median. Negative means faster. */
  differenceDays: number | null
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

const days = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 86_400_000)

/**
 * How long this order took, and how that compares to similar ones.
 *
 * The detail page already collected comparable orders and put them on screen as
 * a list of cards — but never used them to answer the question the visitor
 * actually has, which is whether their own wait is normal. The list showed
 * eight dates; this turns them into one sentence.
 */
export function getWaitComparison(order: Order, comparable: Order[]): WaitComparison | null {
  const ordered = parseGermanDate(order.orderDate)
  if (!ordered) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // A delivery date in the future is an appointment, not a handover. Counting
  // up to it and labelling the result "waited" would tell someone their wait is
  // over while the car is still not there — the same distinction getOrderStatus
  // draws between `delivered` and `delivery_scheduled`.
  const deliveryDate = parseGermanDate(order.deliveryDate)
  const handedOver = deliveryDate && deliveryDate.getTime() <= today.getTime() ? deliveryDate : null

  const waitedDays = handedOver ? days(ordered, handedOver) : days(ordered, today)

  const comparableWaits = comparable
    .map(o => {
      const from = parseGermanDate(o.orderDate)
      const to = parseGermanDate(o.deliveryDate)
      return from && to ? days(from, to) : null
    })
    .filter((v): v is number => v !== null)

  const comparableMedian = median(comparableWaits)

  return {
    waitedDays,
    isDelivered: Boolean(handedOver),
    comparableMedian,
    differenceDays: comparableMedian === null ? null : waitedDays - comparableMedian,
  }
}
