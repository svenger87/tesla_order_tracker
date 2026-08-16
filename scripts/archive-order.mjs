#!/usr/bin/env node
/**
 * Archive one order, by id, with the row printed first.
 *
 * Written for duplicate entries: the same person's same car, entered twice,
 * counted twice in every average. Archiving rather than deleting is deliberate.
 * A duplicate is a judgement — two rows that look alike may be two real orders —
 * and deleting acts on that judgement irreversibly, taking the owner's edit code
 * with it. Archiving takes the row out of the public list and out of every
 * figure, and an admin can put it back.
 *
 * Guards, all of which stop the script rather than guess:
 *   - the id must exist
 *   - --expect-name must match the row, so a mistyped id cannot hit someone else
 *   - an already-archived row is reported and left alone
 *   - the row is printed as JSON before it changes, for the log
 *
 * Usage:
 *   node archive-order.mjs <db> <id> --expect-name <name> [--apply]
 *
 * Without --apply it only reports what it would do.
 */
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'

const args = process.argv.slice(2)
const [dbPath, id] = args
const expectName = args[args.indexOf('--expect-name') + 1]
const apply = args.includes('--apply')

if (!dbPath || !id || !args.includes('--expect-name')) {
  console.error('Usage: archive-order.mjs <db> <id> --expect-name <name> [--apply]')
  process.exit(1)
}
if (!existsSync(dbPath)) {
  console.error(`>>> Database not found at ${dbPath}`)
  process.exit(1)
}

const db = new Database(dbPath, { fileMustExist: true })
const row = db.prepare('SELECT * FROM "Order" WHERE id = ?').get(id)

if (!row) {
  console.error(`>>> No order with id ${id} — nothing done`)
  process.exit(1)
}

console.log('>>> Row:')
console.log(JSON.stringify(row, null, 2))

if (row.name !== expectName) {
  console.error(`>>> Name is "${row.name}", expected "${expectName}" — refusing to archive`)
  process.exit(1)
}

if (row.archived) {
  console.log('>>> Already archived — nothing to do')
  db.close()
  process.exit(0)
}

if (!apply) {
  console.log('>>> Dry run. Pass --apply to archive this row.')
  db.close()
  process.exit(0)
}

db.prepare('UPDATE "Order" SET archived = 1, archivedAt = ? WHERE id = ?')
  .run(new Date().toISOString(), id)

const left = db.prepare('SELECT COUNT(*) AS n FROM "Order" WHERE archived = 0 OR archived IS NULL').get().n
console.log(`>>> Archived. ${left} orders still counted`)
db.close()
