import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function fixDriveAndAhk() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  console.log('=== Checking drive values ===\n')

  const driveValues = await client.execute(`
    SELECT drive, COUNT(*) as count
    FROM "Order"
    GROUP BY drive
    ORDER BY count DESC
  `)
  console.log('Drive values:')
  driveValues.rows.forEach(row => console.log('  "' + row.drive + '":', row.count))

  console.log('\n=== Checking AHK values ===\n')

  const ahkValues = await client.execute(`
    SELECT towHitch, COUNT(*) as count
    FROM "Order"
    GROUP BY towHitch
    ORDER BY count DESC
  `)
  console.log('AHK/towHitch values:')
  ahkValues.rows.forEach(row => console.log('  "' + row.towHitch + '":', row.count))

  console.log('\n=== Fixing values ===\n')

  // Fix drive: Hinterradantrieb -> RWD
  const fixRwd = await client.execute({
    sql: `UPDATE "Order" SET drive = ? WHERE drive = ?`,
    args: ['RWD', 'Hinterradantrieb']
  })
  console.log('Hinterradantrieb -> RWD:', fixRwd.rowsAffected)

  // Fix drive: Allradantrieb -> AWD
  const fixAwd = await client.execute({
    sql: `UPDATE "Order" SET drive = ? WHERE drive = ?`,
    args: ['AWD', 'Allradantrieb']
  })
  console.log('Allradantrieb -> AWD:', fixAwd.rowsAffected)

  // Fix AHK: ja -> Ja
  const fixJa = await client.execute({
    sql: `UPDATE "Order" SET towHitch = ? WHERE towHitch = ?`,
    args: ['Ja', 'ja']
  })
  console.log('ja -> Ja:', fixJa.rowsAffected)

  // Fix AHK: nein -> Nein
  const fixNein = await client.execute({
    sql: `UPDATE "Order" SET towHitch = ? WHERE towHitch = ?`,
    args: ['Nein', 'nein']
  })
  console.log('nein -> Nein:', fixNein.rowsAffected)

  console.log('\n=== After fixes ===\n')

  const driveAfter = await client.execute(`
    SELECT drive, COUNT(*) as count
    FROM "Order"
    GROUP BY drive
    ORDER BY count DESC
  `)
  console.log('Drive values:')
  driveAfter.rows.forEach(row => console.log('  "' + row.drive + '":', row.count))

  const ahkAfter = await client.execute(`
    SELECT towHitch, COUNT(*) as count
    FROM "Order"
    GROUP BY towHitch
    ORDER BY count DESC
  `)
  console.log('\nAHK/towHitch values:')
  ahkAfter.rows.forEach(row => console.log('  "' + row.towHitch + '":', row.count))
}

fixDriveAndAhk().catch(console.error)
