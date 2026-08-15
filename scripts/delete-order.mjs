#!/usr/bin/env node
/**
 * Delete one order from a database, by id, with the row printed first.
 *
 * Written for removing a placeholder entry that was distorting the public
 * figures, and deliberately narrow: it takes an id, not a pattern. A rule like
 * "orders named test%" is how the wrong person's entry gets deleted.
 *
 * Guards, all of which stop the script rather than guess:
 *   - the id must exist
 *   - --expect-name must match the row, so a mistyped id cannot hit someone else
 *   - the row is printed as JSON before it goes, for the log
 *
 * Usage:
 *   node delete-order.mjs <db> <id> --expect-name <name> [--apply]
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
  console.error('Usage: delete-order.mjs <db> <id> --expect-name <name> [--apply]')
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
  console.error(`>>> Name is "${row.name}", expected "${expectName}" — refusing to delete`)
  process.exit(1)
}

if (!apply) {
  console.log('>>> Dry run. Pass --apply to delete this row.')
  db.close()
  process.exit(0)
}

// History rows reference the order; clear them in the same transaction so the
// delete cannot half-succeed.
const remove = db.transaction(() => {
  const history = db.prepare('DELETE FROM "OrderHistory" WHERE orderId = ?').run(id)
  const order = db.prepare('DELETE FROM "Order" WHERE id = ?').run(id)
  return { history: history.changes, order: order.changes }
})

const changes = remove()
console.log(`>>> Deleted ${changes.order} order and ${changes.history} history entries`)

const left = db.prepare('SELECT COUNT(*) AS n FROM "Order"').get().n
console.log(`>>> ${left} orders remain`)
db.close()
