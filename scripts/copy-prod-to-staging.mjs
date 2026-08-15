#!/usr/bin/env node
/**
 * Copy the production database over the staging one.
 *
 * Runs inside a container that has both volumes mounted, so the data never
 * leaves the host.
 *
 * Uses SQLite's own backup API rather than `cp`. A plain file copy of a
 * database that is being written to can capture a torn page — the file looks
 * fine until something reads the wrong part of it. The backup API takes a
 * consistent snapshot while production keeps serving, so nothing has to stop.
 *
 * Production is opened read-only. Nothing in here can write to it.
 *
 * Usage: node copy-prod-to-staging.mjs <prod.db> <staging.db>
 */
import Database from 'better-sqlite3'
import { existsSync, copyFileSync, statSync } from 'node:fs'

const [, , prodPath, stagingPath] = process.argv

if (!prodPath || !stagingPath) {
  console.error('Usage: copy-prod-to-staging.mjs <prod.db> <staging.db>')
  process.exit(1)
}

if (!existsSync(prodPath)) {
  console.error(`>>> Production database not found at ${prodPath}`)
  process.exit(1)
}

const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(1)

// Keep the staging database that is about to be replaced. Same directory, so it
// lands in the staging volume and survives the container exiting.
if (existsSync(stagingPath)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backup = `${stagingPath}.replaced-${stamp}`
  copyFileSync(stagingPath, backup)
  console.log(`>>> Previous staging database kept at ${backup} (${mb(backup)} MB)`)
}

const source = new Database(prodPath, { readonly: true, fileMustExist: true })
const before = source.prepare('SELECT COUNT(*) AS n FROM "Order"').get().n
console.log(`>>> Production holds ${before} orders (${mb(prodPath)} MB)`)

await source.backup(stagingPath)
source.close()

// Read the copy back rather than trusting the write.
const copied = new Database(stagingPath, { readonly: true, fileMustExist: true })
const after = copied.prepare('SELECT COUNT(*) AS n FROM "Order"').get().n
const integrity = copied.pragma('integrity_check', { simple: true })
copied.close()

console.log(`>>> Staging now holds ${after} orders (${mb(stagingPath)} MB), integrity: ${integrity}`)

if (after !== before || integrity !== 'ok') {
  console.error('>>> Copy does not match the source — staging left as written, previous file kept alongside')
  process.exit(1)
}

console.log('>>> Copy verified')
