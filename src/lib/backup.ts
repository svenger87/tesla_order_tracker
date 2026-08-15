import Database from 'better-sqlite3'
import { mkdir, readdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { isBackupName } from './backup-diff'

/**
 * Snapshots of the order database, taken and read from inside the app.
 *
 * Backups go through SQLite's own backup API rather than a file copy. These
 * databases run in WAL mode, so the newest writes live in a side file and `cp`
 * produces a snapshot quietly missing whatever happened last — which is the
 * worst possible failure for a backup, because it looks like it worked.
 *
 * They are written next to the live database, inside the same Docker volume, so
 * they survive a container being replaced. That is deliberately not off-site:
 * this protects against a bad edit, a bad sync or a bad delete, not against
 * losing the machine.
 *
 * Server-side only. There is no `server-only` guard because the module imports
 * node:fs and better-sqlite3, which already makes it impossible to pull into a
 * client bundle — the failure is loud either way, and one fewer dependency.
 */

/** Where the live database lives, read from the same URL Prisma uses. */
function livePath(): string {
  const url = process.env.DATABASE_URL || 'file:./prisma/dev.db'
  return url.replace(/^file:/, '')
}

export function backupDir(): string {
  return path.join(path.dirname(livePath()), 'backups')
}

function fileFor(name: string): string {
  if (!isBackupName(name)) throw new Error(`Refusing backup name: ${name}`)
  // Resolved and re-checked rather than trusted: isBackupName already rejects
  // anything with a separator in it, and this catches a future loosening of it.
  const file = path.resolve(backupDir(), name)
  if (path.dirname(file) !== path.resolve(backupDir())) {
    throw new Error(`Refusing backup path: ${name}`)
  }
  return file
}

function stamp(now: Date): string {
  return now.toISOString().replace(/\.\d+Z$/, 'Z').replace(/:/g, '-')
}

export type BackupInfo = {
  name: string
  createdAt: string
  bytes: number
  orders: number
}

function countOrders(file: string): number {
  const db = new Database(file, { readonly: true, fileMustExist: true })
  try {
    const row = db.prepare('SELECT COUNT(*) AS n FROM "Order"').get() as { n: number }
    return row.n
  } finally {
    db.close()
  }
}

/** Newest first, which is the order somebody looking for a restore wants. */
export async function listBackups(): Promise<BackupInfo[]> {
  const dir = backupDir()
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return []
  }

  const infos: BackupInfo[] = []
  for (const name of names.filter(isBackupName)) {
    const file = path.join(dir, name)
    try {
      const s = await stat(file)
      infos.push({ name, createdAt: s.mtime.toISOString(), bytes: s.size, orders: countOrders(file) })
    } catch {
      // A half-written or corrupt file is skipped rather than breaking the list;
      // it still shows up on disk for whoever needs to look at it.
    }
  }

  return infos.sort((a, b) => b.name.localeCompare(a.name))
}

/**
 * Take a snapshot, then read it back before calling it one.
 *
 * The row count and an integrity check are verified against the source. A
 * backup that cannot be proved good is deleted rather than left to be found
 * later by somebody who needs it.
 */
export async function createBackup(now: Date = new Date()): Promise<BackupInfo> {
  const dir = backupDir()
  await mkdir(dir, { recursive: true })

  const name = `backup-${stamp(now)}.db`
  const file = fileFor(name)

  const source = new Database(livePath(), { readonly: true, fileMustExist: true })
  let expected: number
  try {
    expected = (source.prepare('SELECT COUNT(*) AS n FROM "Order"').get() as { n: number }).n
    await source.backup(file)
  } finally {
    source.close()
  }

  const copy = new Database(file, { readonly: true, fileMustExist: true })
  let actual: number
  let integrity: string
  try {
    actual = (copy.prepare('SELECT COUNT(*) AS n FROM "Order"').get() as { n: number }).n
    integrity = copy.pragma('integrity_check', { simple: true }) as string
  } finally {
    copy.close()
  }

  if (actual !== expected || integrity !== 'ok') {
    await unlink(file).catch(() => {})
    throw new Error(`Backup did not verify: ${actual}/${expected} orders, integrity ${integrity}`)
  }

  const s = await stat(file)
  return { name, createdAt: s.mtime.toISOString(), bytes: s.size, orders: actual }
}

/** Every order in a backup, as plain rows. */
export function readOrders(name: string): Record<string, unknown>[] {
  const db = new Database(fileFor(name), { readonly: true, fileMustExist: true })
  try {
    return db.prepare('SELECT * FROM "Order"').all() as Record<string, unknown>[]
  } finally {
    db.close()
  }
}

export function readOrder(name: string, id: string): Record<string, unknown> | null {
  const db = new Database(fileFor(name), { readonly: true, fileMustExist: true })
  try {
    return (db.prepare('SELECT * FROM "Order" WHERE id = ?').get(id) as Record<string, unknown>) ?? null
  } finally {
    db.close()
  }
}

export async function deleteBackup(name: string): Promise<void> {
  await unlink(fileFor(name))
}

/**
 * Keep the newest `keep` backups and delete the rest.
 *
 * Returns what it removed, so the caller can say so rather than having files
 * disappear silently.
 */
export async function pruneBackups(keep: number): Promise<string[]> {
  const all = await listBackups()
  const doomed = all.slice(Math.max(0, keep))
  for (const b of doomed) await deleteBackup(b.name).catch(() => {})
  return doomed.map(b => b.name)
}
