/**
 * Startup schema migration: copies any missing tables from schema-template.db to prod.db.
 * Runs before server.js on every container start. Safe to run repeatedly.
 */
import Database from 'better-sqlite3'
import { existsSync, copyFileSync } from 'fs'

// Resolve DB path from DATABASE_URL env (e.g. "file:/app/data/prod.db")
const dbUrl = process.env.DATABASE_URL || 'file:/app/data/prod.db'
const PROD_DB = dbUrl.replace(/^file:/, '')
const TEMPLATE_DB = '/app/schema-template.db'

// First-run: copy template if prod doesn't exist
if (!existsSync(PROD_DB)) {
  console.log('[migrate] No prod.db found, copying template...')
  copyFileSync(TEMPLATE_DB, PROD_DB)
  console.log('[migrate] Done.')
  process.exit(0)
}

// Get table schemas from template
const template = new Database(TEMPLATE_DB, { readonly: true })
const templateTables = template.prepare(
  "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'"
).all()

// Get existing tables from prod
const prod = new Database(PROD_DB)
prod.pragma('journal_mode = WAL')
const prodTableNames = new Set(
  prod.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name)
)

let created = 0
for (const table of templateTables) {
  if (!prodTableNames.has(table.name)) {
    console.log(`[migrate] Creating table: ${table.name}`)
    prod.exec(table.sql)
    created++
  }
}

// Also sync indexes from template
const templateIndexes = template.prepare(
  "SELECT name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'"
).all()
const prodIndexNames = new Set(
  prod.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(r => r.name)
)

for (const idx of templateIndexes) {
  if (!prodIndexNames.has(idx.name)) {
    console.log(`[migrate] Creating index: ${idx.name}`)
    prod.exec(idx.sql)
  }
}

template.close()
prod.close()

if (created > 0) {
  console.log(`[migrate] Created ${created} new table(s).`)
} else {
  console.log('[migrate] Schema up to date.')
}
