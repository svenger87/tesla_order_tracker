import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function checkQ3Delivery() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  // Check Q3 orders (July-September 2025)
  const q3Orders = await client.execute(`
    SELECT name, orderDate, deliveryDate, deliveryLocation
    FROM "Order"
    WHERE orderDate LIKE '%07.2025' OR orderDate LIKE '%08.2025' OR orderDate LIKE '%09.2025'
       OR orderDate LIKE '%-07-2025' OR orderDate LIKE '%-08-2025' OR orderDate LIKE '%-09-2025'
    LIMIT 20
  `)
  console.log('Q3 2025 orders:')
  q3Orders.rows.forEach(row => console.log('  ' + row.name + ': orderDate="' + row.orderDate + '", deliveryDate="' + row.deliveryDate + '", location="' + row.deliveryLocation + '"'))

  // Check distinct deliveryDate values for Q3
  const deliveryDates = await client.execute(`
    SELECT deliveryDate, COUNT(*) as count
    FROM "Order"
    WHERE orderDate LIKE '%07.2025' OR orderDate LIKE '%08.2025' OR orderDate LIKE '%09.2025'
       OR orderDate LIKE '%-07-2025' OR orderDate LIKE '%-08-2025' OR orderDate LIKE '%-09-2025'
    GROUP BY deliveryDate
    ORDER BY count DESC
  `)
  console.log('\nQ3 deliveryDate values:')
  deliveryDates.rows.forEach(row => console.log('  "' + row.deliveryDate + '":', row.count))
}

checkQ3Delivery().catch(console.error)
