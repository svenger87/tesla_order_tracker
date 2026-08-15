#!/usr/bin/env node
/**
 * Repair two things the sync left behind, both of which the code now prevents.
 *
 *   1. Order dates stored in a shape nothing could read — 17/04/2026,
 *      27032026 — because the normalizer only knew dots and ISO and turned
 *      everything else into null. The values that did survive did so by
 *      arriving before that step existed.
 *
 *   2. Country `gb`, which this app stores as `uk` everywhere else. The form
 *      writes one, the sync sent the other, so the United Kingdom sat in the
 *      statistics as two countries.
 *
 * Reports what it would change and does nothing without --apply. Every change
 * is printed with its before and after.
 *
 * Usage: node repair-orders.mjs <db> [--apply]
 */
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'

const [, , dbPath] = process.argv
const apply = process.argv.includes('--apply')

if (!dbPath) {
  console.error('Usage: repair-orders.mjs <db> [--apply]')
  process.exit(1)
}
if (!existsSync(dbPath)) {
  console.error(`>>> Database not found at ${dbPath}`)
  process.exit(1)
}

/** Same rules as normalizeDate in src/lib/date-utils.ts, kept in step by hand. */
function normalizeDate(input) {
  if (!input) return null
  const trimmed = String(input).trim()
  if (!trimmed) return null

  let day, month, year
  const dotted = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/)
  const compact = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/)
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)

  if (dotted) {
    [, day, month, year] = dotted.map(Number)
    // A two-digit year means this century, matching normalizeDate in the app.
    if (dotted[3].length === 2) year += 2000
  }
  else if (compact) [, day, month, year] = compact.map(Number)
  else if (iso) [, year, month, day] = iso.map(Number)
  else return null

  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  if (year < YEAR_MIN || year > YEAR_MAX) return null

  // Reject a date the calendar does not have, the way the app does.
  const probe = new Date(year, month - 1, day)
  if (probe.getDate() !== day || probe.getMonth() !== month - 1) return null

  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(day)}.${pad(month)}.${year}`
}

const DATE_FIELDS = ['orderDate', 'vinReceivedDate', 'papersReceivedDate', 'productionDate', 'deliveryDate']
const READABLE = /^\d{2}\.\d{2}\.\d{4}$/

/**
 * A year this dataset could plausibly contain. Same window the app's
 * normalizeDate enforces on input, applied here to values that were stored
 * before it did: one production date reads 26.08.0205, and computing from it
 * produced a duration of -664721 days — a repair inventing worse data than it
 * found.
 */
const YEAR_MIN = new Date().getFullYear() - 6
const YEAR_MAX = new Date().getFullYear() + 6

function usable(value) {
  if (!READABLE.test(String(value || ''))) return null
  const [d, m, y] = value.split('.').map(Number)
  if (y < YEAR_MIN || y > YEAR_MAX) return null
  return Date.UTC(y, m - 1, d)
}

/** Whole days between two usable DD.MM.YYYY dates, or null. */
function daysBetween(from, to) {
  const a = usable(from)
  const b = usable(to)
  if (a === null || b === null) return null
  return Math.round((b - a) / 86400000)
}

/** Mirrors calculateTimePeriods in src/lib/date-utils.ts. */
const DURATIONS = {
  orderToProduction: (r) => daysBetween(r.orderDate, r.productionDate),
  orderToVin: (r) => daysBetween(r.orderDate, r.vinReceivedDate),
  orderToDelivery: (r) => daysBetween(r.orderDate, r.deliveryDate),
  orderToPapers: (r) => daysBetween(r.orderDate, r.papersReceivedDate),
  papersToDelivery: (r) => daysBetween(r.papersReceivedDate, r.deliveryDate),
}

/**
 * Recover a date whose year cannot be right — 26.08.0205 — by asking which year
 * would place it inside the order it belongs to.
 *
 * Not a guess: the day and month are taken as written, and a candidate is only
 * accepted when exactly one year in the plausible window puts the date between
 * the order's own start and end. 26.08.0205 sits on an order placed 05.08.2025
 * and delivered 20.09.2025, so 2025 is the only year that fits and the digit
 * slip is decidable. Where more than one year fits, or none, the value is left
 * alone and reported.
 */
function recoverYearFromTimeline(value, row) {
  const m = String(value || '').trim().match(/^(\d{1,2})[./](\d{1,2})[./]\d{4}$/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])

  const asMs = (v) => {
    const d = String(v || '').trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
    if (!d) return null
    const y = Number(d[3])
    if (y < YEAR_MIN || y > YEAR_MAX) return null
    return Date.UTC(y, Number(d[2]) - 1, Number(d[1]))
  }

  const lower = asMs(row.orderDate)
  const upper = asMs(row.deliveryDate)
  if (lower === null && upper === null) return null

  const fits = []
  for (let y = YEAR_MIN; y <= YEAR_MAX; y++) {
    const probe = new Date(Date.UTC(y, month - 1, day))
    if (probe.getUTCDate() !== day || probe.getUTCMonth() !== month - 1) continue
    const t = probe.getTime()
    if (lower !== null && t < lower) continue
    if (upper !== null && t > upper) continue
    fits.push(y)
  }

  if (fits.length !== 1) return null
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(day)}.${pad(month)}.${fits[0]}`
}

const db = new Database(dbPath, { fileMustExist: true })
const rows = db.prepare('SELECT * FROM "Order"').all()

const dateFixes = []
const countryFixes = []
const durationFixes = []

for (const row of rows) {
  for (const field of DATE_FIELDS) {
    const value = row[field]
    // Readable is not the same as right: 26.08.0205 has the right shape and a
    // year in the third century, so skipping everything that merely looks like a
    // date left it in place. It has to be readable AND plausible to be left alone.
    if (!value) continue
    if (READABLE.test(String(value).trim()) && usable(value) !== null) continue
    const fixed = normalizeDate(value) || recoverYearFromTimeline(value, row)
    if (fixed) dateFixes.push({ id: row.id, name: row.name, field, from: value, to: fixed })
    else console.log(`>>> Cannot read ${field} ${JSON.stringify(value)} on "${row.name}" — left alone`)
  }
  if (row.country === 'gb') {
    countryFixes.push({ id: row.id, name: row.name, from: 'gb', to: 'uk' })
  }
}

// Second pass, over the repaired dates: the stored durations came from the
// spreadsheet rather than from these dates, so they can contradict them. One
// order carries orderToDelivery = -477253 next to no order date at all.
const repairedById = new Map()
for (const row of rows) repairedById.set(row.id, { ...row })
for (const f of dateFixes) repairedById.get(f.id)[f.field] = f.to

// Dates that read cleanly but cannot be true. Left in place rather than
// guessed at — nulling them would hide the typo from whoever can correct it.
for (const row of repairedById.values()) {
  for (const field of DATE_FIELDS) {
    const v = row[field]
    if (v && READABLE.test(String(v)) && usable(v) === null) {
      console.log(`>>> Implausible ${field} ${JSON.stringify(v)} on "${row.name}" — kept, but no duration computed from it`)
    }
  }
}

for (const row of repairedById.values()) {
  for (const [field, compute] of Object.entries(DURATIONS)) {
    const should = compute(row)
    if (row[field] !== should) {
      durationFixes.push({ id: row.id, name: row.name, field, from: row[field], to: should })
    }
  }
}

console.log(`\n>>> ${dateFixes.length} date(s) to repair:`)
for (const f of dateFixes) console.log(`    "${f.name}" ${f.field}: ${JSON.stringify(f.from)} -> ${f.to}`)

console.log(`\n>>> ${countryFixes.length} country code(s) to repair:`)
for (const f of countryFixes) console.log(`    "${f.name}": gb -> uk`)

console.log(`\n>>> ${durationFixes.length} duration(s) to recompute from the dates:`)
const WILD = durationFixes.filter(f => f.from != null && (f.from < -3 || f.from > 1000))
console.log(`    of those, ${WILD.length} currently hold an impossible value:`)
for (const f of WILD) console.log(`      "${f.name}" ${f.field}: ${f.from} -> ${f.to}`)

if (!apply) {
  console.log('\n>>> Dry run. Pass --apply to write these.')
  db.close()
  process.exit(0)
}

const write = db.transaction(() => {
  for (const f of dateFixes) {
    db.prepare(`UPDATE "Order" SET "${f.field}" = ? WHERE id = ?`).run(f.to, f.id)
  }
  for (const f of countryFixes) {
    db.prepare('UPDATE "Order" SET country = ? WHERE id = ?').run(f.to, f.id)
  }
  for (const f of durationFixes) {
    db.prepare(`UPDATE "Order" SET "${f.field}" = ? WHERE id = ?`).run(f.to, f.id)
  }
})
write()

const leftGb = db.prepare("SELECT COUNT(*) AS n FROM \"Order\" WHERE country = 'gb'").get().n
console.log(`\n>>> Written. Rows still carrying gb: ${leftGb}`)
console.log(`>>> Durations recomputed: ${durationFixes.length}`)
db.close()
