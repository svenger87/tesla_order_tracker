import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function check() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  // Check for exact lowercase matches
  const lowercase = await client.execute(`
    SELECT id, name, towHitch
    FROM "Order"
    WHERE towHitch = 'ja' OR towHitch = 'nein'
  `)
  console.log('Orders with lowercase ja/nein:', lowercase.rows.length)
  if (lowercase.rows.length > 0) {
    lowercase.rows.forEach(row => console.log('  ' + row.name + ': "' + row.towHitch + '"'))
  }

  // Show all distinct values
  const distinct = await client.execute(`
    SELECT DISTINCT towHitch, LENGTH(towHitch) as len
    FROM "Order"
    WHERE towHitch IS NOT NULL
  `)
  console.log('\nDistinct towHitch values:')
  distinct.rows.forEach(row => {
    const val = row.towHitch as string
    const hex = [...val].map(c => c.charCodeAt(0).toString(16)).join('')
    console.log('  "' + val + '" len=' + row.len + ' hex=' + hex)
  })
}

check().catch(console.error)
