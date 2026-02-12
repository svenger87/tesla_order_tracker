import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function applyMigration() {
  const isDev = process.env.NODE_ENV !== 'production'
  const useLocalDb = isDev && !process.env.USE_TURSO_IN_DEV

  const url = useLocalDb
    ? (process.env.DATABASE_URL || 'file:./prisma/dev.db')
    : (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./prisma/dev.db')
  const authToken = useLocalDb ? undefined : process.env.TURSO_AUTH_TOKEN

  console.log('Connecting to:', url.startsWith('libsql://') ? url.split('@')[1] : url)

  const client = createClient({
    url,
    ...(authToken && { authToken }),
  })

  try {
    // Check if column already exists
    const tableInfo = await client.execute('PRAGMA table_info(Settings)')
    const columnExists = tableInfo.rows.some(row => row.name === 'archiveEnabled')

    if (columnExists) {
      console.log('Column archiveEnabled already exists. Skipping migration.')
      return
    }

    // Apply migration
    await client.execute('ALTER TABLE Settings ADD COLUMN archiveEnabled INTEGER DEFAULT 1')
    console.log('Migration applied successfully: Added archiveEnabled column to Settings')

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    client.close()
  }
}

applyMigration()
