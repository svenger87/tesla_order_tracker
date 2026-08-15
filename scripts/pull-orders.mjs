#!/usr/bin/env node
/**
 * Pull the public order data from a running site into a local SQLite file.
 *
 * This is an off-site copy of the orders, taken from a machine that is not the
 * one holding them — which is the gap the backup-cron sidecar deliberately does
 * not close, since its snapshots sit in the same volume as the database.
 *
 * It is NOT a database backup, and should not be presented as one:
 *
 *   - it holds 36 of the Order model's 40 fields. The three missing ones are
 *     editCode, resetCode and resetCodeExpires — every owner's credential. A
 *     site rebuilt from this file would lock every user out of their own entry.
 *   - it holds none of the other six tables: Settings, Option, OptionConstraint,
 *     CompositorCode, Admin, and the whole OrderHistory feed.
 *
 * What it does hold is the part nobody could reconstruct: the orders themselves,
 * contributed by the community over years. Losing the settings means an
 * afternoon of clicking; losing this means asking three thousand people to type
 * it all in again.
 *
 * Usage:
 *   node pull-orders.mjs <url> <target-dir> [--keep N]
 */
import Database from 'better-sqlite3'
import { mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import path from 'node:path'

const [url, targetDir] = process.argv.slice(2)
const keepIndex = process.argv.indexOf('--keep')
const keep = keepIndex === -1 ? 14 : Number(process.argv[keepIndex + 1]) || 14

if (!url || !targetDir) {
  console.error('Usage: pull-orders.mjs <url> <target-dir> [--keep N]')
  process.exit(1)
}

const NAME = /^orders-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.(db|json\.gz)$/

console.log(`>>> Fetching ${url}`)
const response = await fetch(url, { headers: { accept: 'application/json' } })
if (!response.ok) {
  console.error(`>>> ${url} answered ${response.status}`)
  process.exit(1)
}

const body = await response.text()
let orders
try {
  orders = JSON.parse(body)
} catch {
  console.error('>>> Response was not JSON — refusing to write it as a backup')
  process.exit(1)
}
if (!Array.isArray(orders) || orders.length === 0) {
  console.error('>>> Expected a non-empty array of orders — refusing to write an empty backup')
  process.exit(1)
}

const columns = [...new Set(orders.flatMap(Object.keys))]
console.log(`>>> ${orders.length} orders, ${columns.length} fields`)

mkdirSync(targetDir, { recursive: true })
const stamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z').replace(/:/g, '-')
const file = path.join(targetDir, `orders-${stamp}.db`)

// The exact bytes the server sent, gzipped, beside the database file. This is
// the archival copy: no schema invented by this script, nothing lost in a type
// mapping, and readable in ten years with nothing but gunzip. The .db beside it
// is for convenience — same data, queryable with the same tooling as the app.
const rawFile = path.join(targetDir, `orders-${stamp}.json.gz`)
writeFileSync(rawFile, gzipSync(Buffer.from(body, 'utf8')))
const sha = createHash('sha256').update(body).digest('hex')
console.log(`>>> ${path.basename(rawFile)} — ${(statSync(rawFile).size / 1048576).toFixed(2)} MB`)
console.log(`>>> sha256 of the response: ${sha}`)

const db = new Database(file)
db.pragma('journal_mode = DELETE')
db.exec(`CREATE TABLE "Order" (${columns.map(c => `"${c}"`).join(', ')})`)

const insert = db.prepare(
  `INSERT INTO "Order" VALUES (${columns.map(() => '?').join(', ')})`,
)
db.transaction(() => {
  for (const order of orders) {
    insert.run(columns.map(c => {
      const v = order[c]
      if (v === undefined) return null
      if (typeof v === 'boolean') return v ? 1 : 0
      if (v !== null && typeof v === 'object') return JSON.stringify(v)
      return v
    }))
  }
})()

// Read it back rather than trusting the write, same rule as every other backup
// here: a file that cannot be proved good is worse than none, because it is
// only ever opened by somebody who has already lost the original.
const written = db.prepare('SELECT COUNT(*) AS n FROM "Order"').get().n
const integrity = db.pragma('integrity_check', { simple: true })
db.close()

if (written !== orders.length || integrity !== 'ok') {
  unlinkSync(file)
  console.error(`>>> Did not verify (${written}/${orders.length}, integrity ${integrity}) — removed`)
  process.exit(1)
}

const mb = (statSync(file).size / 1048576).toFixed(1)
console.log(`>>> ${path.basename(file)} — ${written} orders, ${mb} MB, verified`)

const all = readdirSync(targetDir).filter(n => NAME.test(n)).sort().reverse()
for (const old of all.slice(keep)) {
  unlinkSync(path.join(targetDir, old))
  console.log(`>>> Removed ${old}`)
}
console.log(`>>> ${Math.min(all.length, keep)} copies kept in ${targetDir}`)
