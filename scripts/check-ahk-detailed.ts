import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function checkAhk() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  const result = await client.execute(`
    SELECT towHitch, COUNT(*) as count
    FROM "Order"
    GROUP BY towHitch
    ORDER BY count DESC
  `)

  console.log('AHK values with hex codes:')
  result.rows.forEach(row => {
    const value = row.towHitch as string | null
    if (value) {
      const hex = [...value].map(c => c.charCodeAt(0).toString(16).padStart(4, '0')).join(' ')
      console.log(`  "${value}" (${row.count}) -> ${hex}`)
    } else {
      console.log(`  null (${row.count})`)
    }
  })

  // Check for any lowercase
  const lowercase = await client.execute(`
    SELECT id, name, towHitch
    FROM "Order"
    WHERE towHitch LIKE '%j%' OR towHitch LIKE '%n%'
  `)
  console.log('\nOrders with lowercase in towHitch:')
  lowercase.rows.forEach(row => console.log(`  ${row.id}: "${row.name}" -> "${row.towHitch}"`))
}

checkAhk().catch(console.error)
