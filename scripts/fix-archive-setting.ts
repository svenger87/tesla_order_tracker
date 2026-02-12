import { createClient } from '@libsql/client'

async function fix() {
  const client = createClient({ url: 'file:./prisma/dev.db' })

  // Check current value
  const current = await client.execute('SELECT id, archiveEnabled, archiveThreshold FROM Settings')
  console.log('Current settings:', current.rows)

  // Update if archiveEnabled is null
  const result = await client.execute('UPDATE Settings SET archiveEnabled = 1 WHERE archiveEnabled IS NULL')
  console.log('Updated rows:', result.rowsAffected)

  // Verify
  const after = await client.execute('SELECT id, archiveEnabled, archiveThreshold FROM Settings')
  console.log('After update:', after.rows)

  client.close()
}

fix().catch(console.error)
