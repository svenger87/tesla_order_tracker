import { parseGermanDate } from './date-utils'

/**
 * Telling a sparse entry apart from a broken one.
 *
 * The question came from the forum: how do you distinguish a correct entry from
 * one where somebody filled in half and forgot the rest? The tempting answer —
 * flag anything with a gap — was measured against the live data before it was
 * written, and it does not survive contact:
 *
 *   - papers are unrecorded on a fifth of all orders, and on 20% of delivered
 *     ones. That is how people use the form, not a fault.
 *   - 60% of delivered orders are missing at least one intermediate date. A
 *     warning on three rows in five is not a warning, it is wallpaper.
 *   - an order with nothing but an order date is not half-filled. It is
 *     somebody at the start of the queue.
 *
 * What is left after that is small and real: 29 orders carry a later date but
 * no order date. Every waiting time is measured from that date, so those
 * records cannot be checked against anything, and they are the ones worth
 * pointing at.
 */

/** The chain a car passes through, in the order it passes through it. */
const MILESTONES = [
  'orderDate',
  'vinReceivedDate',
  'productionDate',
  'papersReceivedDate',
  'deliveryDate',
] as const

export type Milestone = (typeof MILESTONES)[number]

type Dated = Partial<Record<Milestone, string | null | undefined>>

function has(order: Dated, field: Milestone): boolean {
  return parseGermanDate(order[field] ?? null) !== null
}

/**
 * Milestones the order has demonstrably passed without recording.
 *
 * A later date is the proof: a car cannot be delivered without having been
 * built, so a delivery date with no production date means that step happened
 * and nobody wrote it down. An empty tail proves nothing and is left alone.
 */
export function missingMilestones(order: Dated): Milestone[] {
  return MILESTONES.filter((field, i) => {
    if (has(order, field)) return false
    return MILESTONES.slice(i + 1).some(later => has(order, later))
  })
}

/**
 * Whether an order's figures can be trusted at all.
 *
 * Deliberately narrow — only a missing order date beneath a later one. Every
 * duration on this site is measured from it, so without it the entry cannot be
 * placed in time, while a missing papers date costs one figure and nothing else.
 */
export function isUnreliable(order: Dated): boolean {
  return missingMilestones(order).includes('orderDate')
}

/** How much of the chain is written down, for showing rather than judging. */
export function recordedMilestones(order: Dated): { recorded: number; total: number } {
  return {
    recorded: MILESTONES.filter(field => has(order, field)).length,
    total: MILESTONES.length,
  }
}
