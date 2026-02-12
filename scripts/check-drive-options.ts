import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function checkOptions() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  const result = await client.execute(`SELECT * FROM "Option" WHERE type = 'drive'`)
  console.log('Drive options in admin settings:')
  result.rows.forEach(row => console.log('  value:', row.value, '| label:', row.label))
}

checkOptions().catch(console.error)
