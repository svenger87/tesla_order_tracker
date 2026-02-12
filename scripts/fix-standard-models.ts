import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function fixStandardModels() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  console.log('=== Current Standard model data ===\n')

  // Check current wheels for Standard
  const wheelsData = await client.execute(
    `SELECT wheels, COUNT(*) as count FROM "Order" WHERE model = 'Standard' GROUP BY wheels`
  )
  console.log('Standard wheels distribution:')
  wheelsData.rows.forEach(row => console.log('  ' + (row.wheels || 'NULL') + ': ' + row.count))

  // Check current drive for Standard
  const driveData = await client.execute(
    `SELECT drive, COUNT(*) as count FROM "Order" WHERE model = 'Standard' GROUP BY drive`
  )
  console.log('\nStandard drive distribution:')
  driveData.rows.forEach(row => console.log('  ' + (row.drive || 'NULL') + ': ' + row.count))

  console.log('\n=== Fixing Standard models ===\n')

  // Fix wheels: all Standard should be 18"
  const wheelsResult = await client.execute(
    `UPDATE "Order" SET wheels = '18"' WHERE model = 'Standard' AND wheels != '18"'`
  )
  console.log('Updated wheels to 18":', wheelsResult.rowsAffected)

  // Fix drive: Standard only has RWD (Hinterradantrieb)
  const driveResult = await client.execute(
    `UPDATE "Order" SET drive = 'Hinterradantrieb' WHERE model = 'Standard' AND drive != 'Hinterradantrieb'`
  )
  console.log('Updated drive to Hinterradantrieb:', driveResult.rowsAffected)

  console.log('\n=== Verification ===\n')

  const verifyWheels = await client.execute(
    `SELECT wheels, COUNT(*) as count FROM "Order" WHERE model = 'Standard' GROUP BY wheels`
  )
  console.log('Standard wheels after fix:')
  verifyWheels.rows.forEach(row => console.log('  ' + (row.wheels || 'NULL') + ': ' + row.count))

  const verifyDrive = await client.execute(
    `SELECT drive, COUNT(*) as count FROM "Order" WHERE model = 'Standard' GROUP BY drive`
  )
  console.log('\nStandard drive after fix:')
  verifyDrive.rows.forEach(row => console.log('  ' + (row.drive || 'NULL') + ': ' + row.count))
}

fixStandardModels().catch(console.error)
