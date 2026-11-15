import { parseGermanDate } from './date-utils'

/**
 * Whether an order's dates can have happened in the order they claim.
 *
 * The one implementation, for the form, the web API and the public API alike.
 * Live data had an order handed over 240 days before it was placed, and others
 * with a VIN, papers or a production date ahead of the order date. Every
 * waiting time on the site is measured from the order date, so each of those
 * is a negative wait in somebody's average.
 *
 * Same day is fine; earlier is not. A rule only applies when both dates are
 * present and readable — a gap is a missing entry, not a contradiction.
 *
 * The VIN is only placed against the handover. It has no fixed position
 * relative to production or papers: Tesla regularly assigns it after
 * production has started.
 *
 * VIN and production may precede the order date: a stock car is built, and
 * has its VIN, before somebody buys it. Live data had 94 orders with
 * production ahead of the order date, 81 of them within a month.
 */

export const DATE_ORDER_FIELDS = [
  'orderDate',
  'vinReceivedDate',
  'productionDate',
  'papersReceivedDate',
  'deliveryDate',
] as const

export type DateOrderField = (typeof DATE_ORDER_FIELDS)[number]

interface Rule {
  /** The date that must come later (or on the same day). */
  field: DateOrderField
  /** The date it must not precede. */
  before: DateOrderField
  code: string
}

/** Checked in this order, so the first violation is the most fundamental. */
const RULES: Rule[] = [
  { field: 'papersReceivedDate', before: 'orderDate', code: 'PAPERS_BEFORE_ORDER' },
  { field: 'deliveryDate', before: 'orderDate', code: 'DELIVERY_BEFORE_ORDER' },
  { field: 'deliveryDate', before: 'vinReceivedDate', code: 'DELIVERY_BEFORE_VIN' },
  { field: 'papersReceivedDate', before: 'productionDate', code: 'PAPERS_BEFORE_PRODUCTION' },
  { field: 'deliveryDate', before: 'productionDate', code: 'DELIVERY_BEFORE_PRODUCTION' },
  { field: 'deliveryDate', before: 'papersReceivedDate', code: 'DELIVERY_BEFORE_PAPERS' },
]

export interface DateOrderViolation {
  /** The field whose date is too early (or, for ORDER_DATE_IN_FUTURE, too late). */
  field: DateOrderField
  /** The field it conflicts with; null for an order date in the future. */
  before: DateOrderField | null
  code: string
  /** The stored strings, for messages. */
  fieldValue: string
  beforeValue: string | null
}

type Dates = Partial<Record<string, unknown>>

function read(data: Dates, field: DateOrderField): { raw: string; date: Date } | null {
  const raw = data[field]
  if (typeof raw !== 'string') return null
  const date = parseGermanDate(raw)
  return date ? { raw, date } : null
}

/** Every rule the dates break, in RULES order. Empty when they are consistent. */
export function findDateOrderViolations(data: Dates, now = new Date()): DateOrderViolation[] {
  const out: DateOrderViolation[] = []

  // Future handovers are the normal case; a future order is not.
  const order = read(data, 'orderDate')
  if (order) {
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)
    if (order.date.getTime() > endOfToday.getTime()) {
      out.push({ field: 'orderDate', before: null, code: 'ORDER_DATE_IN_FUTURE', fieldValue: order.raw, beforeValue: null })
    }
  }

  for (const rule of RULES) {
    const later = read(data, rule.field)
    const earlier = read(data, rule.before)
    if (!later || !earlier) continue
    if (later.date.getTime() < earlier.date.getTime()) {
      out.push({ field: rule.field, before: rule.before, code: rule.code, fieldValue: later.raw, beforeValue: earlier.raw })
    }
  }
  return out
}

function same(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v === undefined || v === null || v === '' ? null : v)
  return norm(a) === norm(b)
}

/** Date fields whose value in `next` differs from `stored`. All present ones when there is nothing stored. */
export function changedDateFields(stored: Dates | null, next: Dates): Set<DateOrderField> {
  return new Set(DATE_ORDER_FIELDS.filter(f => (stored ? !same(stored[f], next[f]) : !same(null, next[f]))))
}

/**
 * The violations an edit is responsible for: those in the order as it will be
 * after the edit (`next`, the merged result) that involve a date the edit
 * changed. A violation between two dates the edit left alone was already
 * stored and is let through, so the 98 live orders that break a rule today can
 * still be edited — fixing a typo in the name must not demand a fix to a date
 * somebody else synced years ago. Touching either side of the conflict makes
 * it the editor's, whether the edit created it or merely kept it.
 *
 * With nothing stored (a new order) every violation counts.
 */
export function dateOrderViolationsIntroduced(stored: Dates | null, next: Dates, now = new Date()): DateOrderViolation[] {
  const all = findDateOrderViolations(next, now)
  if (!stored) return all
  const changed = changedDateFields(stored, next)
  return all.filter(v => changed.has(v.field) || (v.before !== null && changed.has(v.before)))
}

/** One English sentence naming the fields, for API callers and logs. */
export function describeViolation(v: DateOrderViolation): string {
  if (v.before === null) return `${v.field} (${v.fieldValue}) is in the future`
  return `${v.field} (${v.fieldValue}) is before ${v.before} (${v.beforeValue})`
}

/**
 * Where to show a violation in a form: on the date the person just changed,
 * so the message lands where their attention is. When they changed both (or
 * it is a new order), on the later field — that is the one that broke the
 * sequence by being too early.
 */
export function blamedField(v: DateOrderViolation, changed: Set<DateOrderField>): DateOrderField {
  if (v.before !== null && changed.has(v.before) && !changed.has(v.field)) return v.before
  return v.field
}
