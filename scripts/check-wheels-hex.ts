import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function checkWheelsHex() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  const wheels = await client.execute(`
    SELECT DISTINCT wheels
    FROM "Order"
    WHERE wheels IS NOT NULL
  `)

  console.log('Wheel values with hex codes:')
  wheels.rows.forEach(row => {
    const value = row.wheels as string
    const hex = [...value].map(c => c.charCodeAt(0).toString(16).padStart(4, '0')).join(' ')
    console.log(`  "${value}" -> ${hex}`)
  })
}

checkWheelsHex().catch(console.error)
