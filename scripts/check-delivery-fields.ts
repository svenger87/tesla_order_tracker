import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function checkDeliveryFields() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  // Check deliveryDate values
  const deliveryDates = await client.execute(`
    SELECT deliveryDate, COUNT(*) as count
    FROM "Order"
    WHERE deliveryDate IS NOT NULL
    GROUP BY deliveryDate
    ORDER BY count DESC
    LIMIT 20
  `)
  console.log('Sample deliveryDate values:')
  deliveryDates.rows.forEach(row => console.log('  "' + row.deliveryDate + '":', row.count))

  // Check deliveryLocation values
  const deliveryLocations = await client.execute(`
    SELECT deliveryLocation, COUNT(*) as count
    FROM "Order"
    WHERE deliveryLocation IS NOT NULL
    GROUP BY deliveryLocation
    ORDER BY count DESC
    LIMIT 20
  `)
  console.log('\nSample deliveryLocation values:')
  deliveryLocations.rows.forEach(row => console.log('  "' + row.deliveryLocation + '":', row.count))

  // Check a few sample rows
  const samples = await client.execute(`
    SELECT name, deliveryDate, deliveryLocation
    FROM "Order"
    LIMIT 5
  `)
  console.log('\nSample orders:')
  samples.rows.forEach(row => console.log('  ' + row.name + ': date="' + row.deliveryDate + '", location="' + row.deliveryLocation + '"'))
}

checkDeliveryFields().catch(console.error)
