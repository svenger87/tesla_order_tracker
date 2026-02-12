import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function fixQ3DeliveryDate() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  console.log('=== Fixing Q3 deliveryDate (clearing option codes) ===\n')

  // Check current state
  const before = await client.execute(`
    SELECT deliveryDate, COUNT(*) as count
    FROM "Order"
    WHERE (orderDate LIKE '%07.2025' OR orderDate LIKE '%08.2025' OR orderDate LIKE '%09.2025')
      AND deliveryDate IS NOT NULL
    GROUP BY deliveryDate
    ORDER BY count DESC
  `)
  console.log('Before - Q3 deliveryDate values:')
  before.rows.forEach(row => console.log('  "' + row.deliveryDate + '":', row.count))

  // Clear deliveryDate where it contains option codes (not actual dates)
  // Option codes: BT44, BT 44, BT 43, etc. - anything that doesn't look like a date
  const result = await client.execute(`
    UPDATE "Order"
    SET deliveryDate = NULL
    WHERE (orderDate LIKE '%07.2025' OR orderDate LIKE '%08.2025' OR orderDate LIKE '%09.2025')
      AND deliveryDate IS NOT NULL
      AND deliveryDate NOT LIKE '%.%.%'
      AND deliveryDate NOT LIKE '%-%-%'
  `)
  console.log('\nCleared non-date values:', result.rowsAffected)

  // Verify
  const after = await client.execute(`
    SELECT deliveryDate, COUNT(*) as count
    FROM "Order"
    WHERE (orderDate LIKE '%07.2025' OR orderDate LIKE '%08.2025' OR orderDate LIKE '%09.2025')
      AND deliveryDate IS NOT NULL
    GROUP BY deliveryDate
    ORDER BY count DESC
  `)
  console.log('\nAfter - Q3 deliveryDate values:')
  if (after.rows.length === 0) {
    console.log('  (all cleared or only valid dates remain)')
  } else {
    after.rows.forEach(row => console.log('  "' + row.deliveryDate + '":', row.count))
  }
}

fixQ3DeliveryDate().catch(console.error)
