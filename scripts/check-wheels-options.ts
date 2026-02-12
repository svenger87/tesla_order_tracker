import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function checkWheels() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  // Check wheel options in admin settings
  const options = await client.execute(`SELECT * FROM "Option" WHERE type = 'wheels' ORDER BY sortOrder`)
  console.log('Wheel options in admin settings:')
  options.rows.forEach(row => console.log('  id:', row.id, '| value:', row.value, '| label:', row.label))

  // Check actual wheel values in orders
  const wheelsUsed = await client.execute(`SELECT wheels, COUNT(*) as count FROM "Order" GROUP BY wheels ORDER BY count DESC`)
  console.log('\nWheel values in orders:')
  wheelsUsed.rows.forEach(row => console.log('  "' + row.wheels + '":', row.count))
}

checkWheels().catch(console.error)
