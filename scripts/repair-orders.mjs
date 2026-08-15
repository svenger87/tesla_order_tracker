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
  const dotted = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  const compact = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/)
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)

  if (dotted) [, day, month, year] = dotted.map(Number)
  else if (compact) [, day, month, year] = compact.map(Number)
  else if (iso) [, year, month, day] = iso.map(Number)
  else return null

  if (day < 1 || day > 31 || month < 1 || month > 12) return null

  // Reject a date the calendar does not have, the way the app does.
  const probe = new Date(year, month - 1, day)
  if (probe.getDate() !== day || probe.getMonth() !== month - 1) return null

  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(day)}.${pad(month)}.${year}`
}

const DATE_FIELDS = ['orderDate', 'vinReceivedDate', 'papersReceivedDate', 'productionDate', 'deliveryDate']
const READABLE = /^\d{2}\.\d{2}\.\d{4}$/

const db = new Database(dbPath, { fileMustExist: true })
const rows = db.prepare('SELECT * FROM "Order"').all()

const dateFixes = []
const countryFixes = []

for (const row of rows) {
  for (const field of DATE_FIELDS) {
    const value = row[field]
    if (!value || READABLE.test(String(value).trim())) continue
    const fixed = normalizeDate(value)
    if (fixed) dateFixes.push({ id: row.id, name: row.name, field, from: value, to: fixed })
    else console.log(`>>> Cannot read ${field} ${JSON.stringify(value)} on "${row.name}" — left alone`)
  }
  if (row.country === 'gb') {
    countryFixes.push({ id: row.id, name: row.name, from: 'gb', to: 'uk' })
  }
}

console.log(`\n>>> ${dateFixes.length} date(s) to repair:`)
for (const f of dateFixes) console.log(`    "${f.name}" ${f.field}: ${JSON.stringify(f.from)} -> ${f.to}`)

console.log(`\n>>> ${countryFixes.length} country code(s) to repair:`)
for (const f of countryFixes) console.log(`    "${f.name}": gb -> uk`)

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
})
write()

const leftGb = db.prepare("SELECT COUNT(*) AS n FROM \"Order\" WHERE country = 'gb'").get().n
console.log(`\n>>> Written. Rows still carrying gb: ${leftGb}`)
db.close()
