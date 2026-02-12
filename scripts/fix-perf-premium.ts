import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function fixModels() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  console.log('=== Fixing Performance and Premium ===\n')

  // 1. Performance -> Allradantrieb
  const perfDriveCount = await client.execute(
    `SELECT drive, COUNT(*) as count FROM "Order" WHERE model = 'Performance' GROUP BY drive`
  )
  console.log('Performance drive before:')
  perfDriveCount.rows.forEach(row => console.log('  ' + (row.drive || 'NULL') + ': ' + row.count))

  const perfResult = await client.execute(
    `UPDATE "Order" SET drive = 'Allradantrieb' WHERE model = 'Performance'`
  )
  console.log('Updated Performance drive to Allradantrieb:', perfResult.rowsAffected)

  // 2. Premium -> Maximale Reichweite
  const premRangeCount = await client.execute(
    `SELECT range, COUNT(*) as count FROM "Order" WHERE model = 'Premium' GROUP BY range`
  )
  console.log('\nPremium range before:')
  premRangeCount.rows.forEach(row => console.log('  ' + (row.range || 'NULL') + ': ' + row.count))

  const premResult = await client.execute(
    `UPDATE "Order" SET range = 'Maximale Reichweite' WHERE model = 'Premium'`
  )
  console.log('Updated Premium range to Maximale Reichweite:', premResult.rowsAffected)

  // Verify
  console.log('\n=== Verification ===')

  const verifyPerf = await client.execute(
    `SELECT drive, COUNT(*) as count FROM "Order" WHERE model = 'Performance' GROUP BY drive`
  )
  console.log('\nPerformance drive after:')
  verifyPerf.rows.forEach(row => console.log('  ' + (row.drive || 'NULL') + ': ' + row.count))

  const verifyPrem = await client.execute(
    `SELECT range, COUNT(*) as count FROM "Order" WHERE model = 'Premium' GROUP BY range`
  )
  console.log('\nPremium range after:')
  verifyPrem.rows.forEach(row => console.log('  ' + (row.range || 'NULL') + ': ' + row.count))
}

fixModels().catch(console.error)
