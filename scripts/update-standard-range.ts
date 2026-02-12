import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function updateStandardRange() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./prisma/dev.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

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
