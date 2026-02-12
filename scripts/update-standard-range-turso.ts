import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

// Load both env files
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function updateStandardRange() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('TURSO')))
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN required')
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  console.log('Connected to Turso:', process.env.TURSO_DATABASE_URL.substring(0, 30) + '...')

  // First check how many entries have model = 'Standard'
  const countResult = await client.execute(
    `SELECT COUNT(*) as count FROM "Order" WHERE model = 'Standard'`
  )
  console.log('Orders with model = Standard:', countResult.rows[0].count)

  // Update range to 'Standard' for all entries with model = 'Standard'
  const updateResult = await client.execute(
    `UPDATE "Order" SET range = 'Standard' WHERE model = 'Standard'`
  )
  console.log('Updated rows:', updateResult.rowsAffected)

  // Verify
  const verifyResult = await client.execute(
    `SELECT COUNT(*) as count FROM "Order" WHERE model = 'Standard' AND range = 'Standard'`
  )
  console.log('Verified (model=Standard, range=Standard):', verifyResult.rows[0].count)
}

updateStandardRange().catch(console.error)
