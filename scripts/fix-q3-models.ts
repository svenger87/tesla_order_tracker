import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function fixQ3Models() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  console.log('=== Q3 2025 Orders (July - September 2025) ===\n')

  // Q3 2025: orderDate between 01.07.2025 and 30.09.2025
  // German date format: DD.MM.YYYY
  // We need to match dates like "01.07.2025" to "30.09.2025"

  // Check current Q3 model distribution
  const q3Before = await client.execute(`
    SELECT model, COUNT(*) as count
    FROM "Order"
    WHERE (
      (orderDate LIKE '%.07.2025' OR orderDate LIKE '%.08.2025' OR orderDate LIKE '%.09.2025')
    )
    GROUP BY model
  `)
  console.log('Q3 2025 model distribution BEFORE:')
  q3Before.rows.forEach(row => console.log('  ' + (row.model || 'NULL') + ': ' + row.count))

  const totalQ3 = await client.execute(`
    SELECT COUNT(*) as count
    FROM "Order"
    WHERE (
      (orderDate LIKE '%.07.2025' OR orderDate LIKE '%.08.2025' OR orderDate LIKE '%.09.2025')
    )
  `)
  console.log('\nTotal Q3 2025 orders:', totalQ3.rows[0].count)

  // Update all Q3 2025 orders to Premium
  const updateResult = await client.execute(`
    UPDATE "Order"
    SET model = 'Premium'
    WHERE (
      (orderDate LIKE '%.07.2025' OR orderDate LIKE '%.08.2025' OR orderDate LIKE '%.09.2025')
    )
    AND model != 'Premium'
  `)
  console.log('\nUpdated to Premium:', updateResult.rowsAffected)

  // Verify
  const q3After = await client.execute(`
    SELECT model, COUNT(*) as count
    FROM "Order"
    WHERE (
      (orderDate LIKE '%.07.2025' OR orderDate LIKE '%.08.2025' OR orderDate LIKE '%.09.2025')
    )
    GROUP BY model
  `)
  console.log('\nQ3 2025 model distribution AFTER:')
  q3After.rows.forEach(row => console.log('  ' + (row.model || 'NULL') + ': ' + row.count))
}

fixQ3Models().catch(console.error)
