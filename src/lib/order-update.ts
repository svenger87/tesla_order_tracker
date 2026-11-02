import { calculateTimePeriods } from './date-utils'
import { normalizeCountryCode } from './country-code'

/**
 * Dates a person can enter on a TOST order in the webapp, because Tesla does
 * not always give TOST one. A sync that has none must not erase what somebody
 * typed in — that is how orders lost their order date and then showed the
 * incomplete badge.
 */
export const TOST_KEEP_WHEN_EMPTY = ['orderDate', 'productionDate'] as const

/** Drops empty values for `fields` from an update, so the stored ones stay. */
export function keepStoredWhenEmpty(update: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> {
  const out = { ...update }
  for (const f of fields) {
    if (f in out && (out[f] === null || out[f] === undefined || out[f] === '')) delete out[f]
  }
  return out
}

/**
 * All five waiting times, worked out from the order as it will be after the
 * update — stored dates merged with the new ones. A value that can no longer
 * be worked out comes back null, so it is cleared rather than left behind.
 * Computing from the update alone kept stale numbers on 230 orders, among
 * them −477253 days on one whose order date had gone.
 */
export function timePeriodsAfterUpdate(stored: Record<string, unknown> | null, update: Record<string, unknown>) {
  const merged = { ...(stored ?? {}), ...update }
  const date = (k: string) => (typeof merged[k] === 'string' ? (merged[k] as string) : null)
  return calculateTimePeriods({
    orderDate: date('orderDate'),
    productionDate: date('productionDate'),
    vinReceivedDate: date('vinReceivedDate'),
    deliveryDate: date('deliveryDate'),
    papersReceivedDate: date('papersReceivedDate'),
  })
}

/** `gb` → `uk` on any update that carries a country, as on create. */
export function normalizeCountryIn(update: Record<string, unknown>): Record<string, unknown> {
  if (typeof update.country !== 'string') return update
  return { ...update, country: normalizeCountryCode(update.country) }
}
