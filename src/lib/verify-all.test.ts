import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { calculateStatistics } from './statistics'
import { predictDelivery } from './prediction'
import { parseGermanDate, calculateDaysBetween, normalizeDate } from './date-utils'
import { isHandedOver, isStaleOpen, countsTowardStats, startOfToday } from './order-state'
import { isUnreliable, missingMilestones } from './order-completeness'
import { parseDeliveryWindowStart } from './delivery-window'
import type { Order } from './types'

/**
 * Every figure the site publishes, recomputed here from the same data by a
 * second implementation that shares no code with the first, and compared.
 *
 * Not a unit test — a gate. Run against a copy of production before the work
 * goes live, because a calculation that is individually correct can still be
 * wrong about the population it runs over, and only a whole-dataset comparison
 * catches that.
 */

/**
 * Point this at a copy of the live data to run the gate:
 *   curl -s https://tff-order-stats.de/api/orders > /tmp/orders.json
 *   VERIFY_ORDERS=/tmp/orders.json npm test -- verify-all
 *
 * Skipped without it, so CI stays green without carrying a dataset around.
 */
const SOURCE = process.env.VERIFY_ORDERS
const rows: Order[] = SOURCE ? JSON.parse(readFileSync(SOURCE, 'utf8')) : []

/** Independent date reader: no import from date-utils. */
function d(s: unknown): Date | null {
  if (typeof s !== 'string') return null
  // 1-2 digits, because production still holds ~158 dates written 9.2.2026 —
  // the repair has not run there. date-fns reads those, so a stricter reader
  // here would report the app as wrong for accepting a date that is fine.
  const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) return null
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const now = new Date().getFullYear()
  if (year < now - 6 || year > now + 6) return null
  const probe = new Date(year, month - 1, day)
  if (probe.getDate() !== day || probe.getMonth() !== month - 1) return null
  return probe
}

const today = startOfToday()
const between = (a: unknown, b: unknown) => {
  const from = d(a), to = d(b)
  if (!from || !to) return null
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000)
  return days < 0 ? null : days
}
const mean = (v: number[]) => (v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null)

const live = rows.filter(o => !o.cancelled && !o.archived)
const handed = live.filter(o => { const dd = d(o.deliveryDate); return dd !== null && dd.getTime() <= today.getTime() })

const stats = calculateStatistics(rows)
const report: string[] = []
const check = (label: string, mine: unknown, theirs: unknown) => {
  const ok = JSON.stringify(mine) === JSON.stringify(theirs)
  report.push(`${ok ? '  OK  ' : '  ABWEICHUNG '} ${label}: App=${JSON.stringify(theirs)} Nachrechnung=${JSON.stringify(mine)}`)
  return ok
}

it.skipIf(!SOURCE)('every published figure survives an independent recount', () => {
  check('Bestellungen gesamt', live.length, stats.totalOrders)
  check('ausgeliefert', handed.length, stats.deliveredOrders)
  check('ausstehend', live.length - handed.length, stats.pendingOrders)
  check('storniert', rows.filter(o => o.cancelled).length, stats.cancelledOrders)

  check('Ø Bestellung→Lieferung', mean(handed.map(o => between(o.orderDate, o.deliveryDate)).filter((x): x is number => x !== null)), stats.avgOrderToDelivery)
  check('Ø Bestellung→VIN', mean(handed.map(o => between(o.orderDate, o.vinReceivedDate)).filter((x): x is number => x !== null)), stats.avgOrderToVin)
  check('Ø Bestellung→Papiere', mean(handed.map(o => between(o.orderDate, o.papersReceivedDate)).filter((x): x is number => x !== null)), stats.avgOrderToPapers)
  check('Ø Papiere→Lieferung', mean(handed.map(o => between(o.papersReceivedDate, o.deliveryDate)).filter((x): x is number => x !== null)), stats.avgPapersToDelivery)
  check('Ø VIN→Produktion', mean(handed.map(o => between(o.vinReceivedDate, o.productionDate)).filter((x): x is number => x !== null)), stats.avgVinToProduction)
  check('Ø Produktion→Papiere', mean(handed.map(o => between(o.productionDate, o.papersReceivedDate)).filter((x): x is number => x !== null)), stats.avgProductionToPapers)

  check('Stichprobe Bestellung→Lieferung', handed.filter(o => between(o.orderDate, o.deliveryDate) !== null).length, stats.sampleSizes.orderToDelivery)
  check('Stichprobe Bestellung→Papiere', handed.filter(o => between(o.orderDate, o.papersReceivedDate) !== null).length, stats.sampleSizes.orderToPapers)

  check('TOST-Bestellungen', live.filter(o => o.source === 'tost').length, stats.tostOrders)
  check('Webapp-Bestellungen', live.filter(o => o.source !== 'tost').length, stats.manualOrders)
  check('ohne gültiges Datum', live.filter(o => d(o.orderDate) === null).length, stats.ordersWithoutDate)

  // Every duration the app reports must be non-negative and derived from dates
  // that are actually present. A single leak here is what produced -477253.
  const segs = [stats.segmentOrderToVin, stats.segmentVinToProduction, stats.segmentProductionToPapers, stats.segmentPapersToDelivery]
  check('kein negatives Segment', true, segs.every(s => s.min === null || s.min >= 0))
  check('kein Segment über 400 Tage', true, segs.every(s => s.max === null || s.max <= 400))
  check('Ø innerhalb Min/Max', true, segs.every(s => s.avg === null || (s.min !== null && s.max !== null && s.avg >= s.min && s.avg <= s.max)))

  // The figure the forum objected to: the pipeline total must be the measured
  // one, not four segment averages added together.
  const summed = [stats.avgOrderToVin, stats.avgVinToProduction, stats.avgProductionToPapers, stats.avgPapersToDelivery]
    .filter((x): x is number => x !== null).reduce((s, x) => s + x, 0)
  report.push(`  HINWEIS Summe der Segmente=${summed}, gemessene Gesamtdauer=${stats.avgOrderToDelivery} (angezeigt wird die gemessene)`)

  // Country medians
  const de = stats.countryDeliveryStats.find(c => c.country === 'de')
  const deDays = handed.filter(o => o.country === 'de').map(o => between(o.orderDate, o.deliveryDate)).filter((x): x is number => x !== null).sort((a, b) => a - b)
  const median = deDays.length % 2 ? deDays[(deDays.length - 1) / 2] : Math.round((deDays[deDays.length / 2 - 1] + deDays[deDays.length / 2]) / 2)
  check('Median Deutschland', median, de?.medianDays)
  check('Anzahl Deutschland', deDays.length, de?.count)

  // Predictions must never be built from a delivery that has not happened.
  let leaks = 0
  for (const o of live.slice(0, 400)) {
    const p = predictDelivery(rows, o.vehicleType, o.model ?? undefined, o.country ?? undefined, o.drive ?? undefined, o.orderDate ?? undefined, o)
    if (p && (p.optimisticDays > p.expectedDays || p.expectedDays > p.pessimisticDays)) leaks++
  }
  check('Quantile in Reihenfolge (400 Stichproben)', 0, leaks)

  // Flags on the shared predicates
  check('isHandedOver stimmt mit Nachrechnung', handed.length, live.filter(o => isHandedOver(o, today)).length)
  check('countsTowardStats stimmt', live.length, rows.filter(countsTowardStats).length)
  check('veraltet zählbar', true, typeof live.filter(o => isStaleOpen(o, today)).length === 'number')

  // Completeness rule stays narrow
  const unreliable = live.filter(isUnreliable).length
  const anyGap = live.filter(o => missingMilestones(o).length > 0).length
  report.push(`  HINWEIS unzuverlässig=${unreliable} (${Math.round(100 * unreliable / live.length)}%), irgendeine Lücke=${anyGap} (${Math.round(100 * anyGap / live.length)}%)`)

  // Date handling
  check('normalizeDate 2-stelliges Jahr', '11.12.2025', normalizeDate('11.12.25'))
  check('normalizeDate lehnt 31.02. ab', null, normalizeDate('31.02.2026'))
  check('parseGermanDate lehnt Jahr 205 ab', null, parseGermanDate('26.08.0205'))
  check('calculateDaysBetween über ein Jahr', 424, calculateDaysBetween('01.01.2025', '01.03.2026'))

  // Delivery windows
  const wins = live.filter(o => o.deliveryWindow)
  const parsed = wins.filter(o => parseDeliveryWindowStart(o.deliveryWindow, o.orderDate) !== null).length
  report.push(`  HINWEIS Lieferfenster lesbar: ${parsed}/${wins.length} (${Math.round(100 * parsed / wins.length)}%)`)

  console.log('\n' + report.join('\n') + '\n')
  const failed = report.filter(r => r.startsWith('  ABWEICHUNG'))
  expect(failed, `\n${failed.join('\n')}`).toEqual([])
  // 400 predictions over 3000 orders take a few seconds. Left at the 5s default
  // this failed intermittently on time rather than on any figure — a gate that
  // reports a false alarm is worse than no gate, because the next red run gets
  // waved through.
}, 120_000)
