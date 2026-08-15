#!/usr/bin/env node
/**
 * Take a verified snapshot of the order database.
 *
 * Runs unattended in the backup-cron container, and can be run by hand on the
 * host. The admin dashboard does the same thing through src/lib/backup.ts; this
 * is the standalone twin, because the runtime image ships the Next server
 * bundle rather than an importable copy of that module.
 *
 * The filename shape is load-bearing: the app only lists and restores files
 * matching isBackupName() in src/lib/backup-diff.ts. A test asserts the two
 * agree, so a change here that the app would not recognise fails CI rather than
 * producing snapshots nobody can see.
 *
 * Through SQLite's backup API, never cp: these databases run in WAL mode, so
 * the newest writes sit in a side file and a file copy silently drops them.
 *
 * Usage:
 *   node backup.mjs <db> [--keep N] [--min-age-hours H]
 *
 * --min-age-hours exists because the container restarts on every deploy. Taking
 * a snapshot each time would, on a busy day, push every older one out of a
 * twenty-deep retention and leave nothing but the last hour.
 */
import Database from 'better-sqlite3'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const dbPath = args[0]
const numberAfter = (flag, fallback) => {
  const i = args.indexOf(flag)
  if (i === -1) return fallback
  const value = Number(args[i + 1])
  return Number.isFinite(value) ? value : fallback
}
const keep = numberAfter('--keep', Number(process.env.BACKUP_KEEP) || 20)
const minAgeHours = numberAfter('--min-age-hours', Number(process.env.BACKUP_MIN_AGE_HOURS) || 0)

if (!dbPath) {
  console.error('Usage: backup.mjs <db> [--keep N] [--min-age-hours H]')
  process.exit(1)
}
if (!existsSync(dbPath)) {
  console.error(`>>> Database not found at ${dbPath}`)
  process.exit(1)
}

/** Must stay in step with isBackupName() in src/lib/backup-diff.ts. */
const BACKUP_NAME = /^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.db$/

const dir = path.join(path.dirname(dbPath), 'backups')
mkdirSync(dir, { recursive: true })

const existing = readdirSync(dir)
  .filter(n => BACKUP_NAME.test(n))
  .map(n => ({ name: n, mtime: statSync(path.join(dir, n)).mtimeMs }))
  .sort((a, b) => b.name.localeCompare(a.name))

if (minAgeHours > 0 && existing.length > 0) {
  const newest = Math.max(...existing.map(b => b.mtime))
  const ageHours = (Date.now() - newest) / 3_600_000
  if (ageHours < minAgeHours) {
    console.log(`>>> Newest backup is ${ageHours.toFixed(1)}h old, under the ${minAgeHours}h floor — nothing to do`)
    process.exit(0)
  }
}

const name = `backup-${new Date().toISOString().replace(/\.\d+Z$/, 'Z').replace(/:/g, '-')}.db`
const file = path.join(dir, name)

const source = new Database(dbPath, { readonly: true, fileMustExist: true })
const expected = source.prepare('SELECT COUNT(*) AS n FROM "Order"').get().n
await source.backup(file)
source.close()

// Read the copy back rather than trusting the write. A backup that cannot be
// proved good is removed: finding a corrupt file at the moment you need it is
// worse than knowing you have none.
const copy = new Database(file, { readonly: true, fileMustExist: true })
const actual = copy.prepare('SELECT COUNT(*) AS n FROM "Order"').get().n
const integrity = copy.pragma('integrity_check', { simple: true })
copy.close()

if (actual !== expected || integrity !== 'ok') {
  unlinkSync(file)
  console.error(`>>> Backup did not verify (${actual}/${expected} orders, integrity ${integrity}) — removed`)
  process.exit(1)
}

const mb = (statSync(file).size / 1048576).toFixed(1)
console.log(`>>> ${name} — ${actual} orders, ${mb} MB, verified`)

// Pruned only after the new one exists and verified: a failed backup must not
// also cost the oldest good one.
const doomed = [{ name, mtime: Date.now() }, ...existing].slice(Math.max(0, keep))
for (const b of doomed) {
  unlinkSync(path.join(dir, b.name))
  console.log(`>>> Removed ${b.name}`)
}
console.log(`>>> ${Math.min(existing.length + 1, keep)} backup(s) kept`)
