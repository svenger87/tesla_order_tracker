import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function fixDriveValues() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  console.log('=== Fixing drive values ===\n')

  // Check current state
  const before = await client.execute(`
    SELECT model, drive, COUNT(*) as count
    FROM "Order"
    WHERE model IN ('Standard', 'Performance')
    GROUP BY model, drive
  `)
  console.log('Before:')
  before.rows.forEach(row => console.log('  ' + row.model + ' | ' + row.drive + ': ' + row.count))

  // Fix Standard: Hinterradantrieb -> RWD
  const stdResult = await client.execute(`
    UPDATE "Order" SET drive = 'RWD' WHERE model = 'Standard' AND drive = 'Hinterradantrieb'
  `)
  console.log('\nStandard Hinterradantrieb -> RWD:', stdResult.rowsAffected)

  // Fix Performance: Allradantrieb -> AWD
  const perfResult = await client.execute(`
    UPDATE "Order" SET drive = 'AWD' WHERE model = 'Performance' AND drive = 'Allradantrieb'
  `)
  console.log('Performance Allradantrieb -> AWD:', perfResult.rowsAffected)

  // Verify
  const after = await client.execute(`
    SELECT model, drive, COUNT(*) as count
    FROM "Order"
    WHERE model IN ('Standard', 'Performance')
    GROUP BY model, drive
  `)
  console.log('\nAfter:')
  after.rows.forEach(row => console.log('  ' + row.model + ' | ' + row.drive + ': ' + row.count))
}

fixDriveValues().catch(console.error)
