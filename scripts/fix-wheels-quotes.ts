import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function fixWheelsQuotes() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  console.log('=== Fixing wheel quote characters ===\n')

  // Check current state
  const before = await client.execute(`
    SELECT wheels, COUNT(*) as count
    FROM "Order"
    GROUP BY wheels
    ORDER BY count DESC
  `)
  console.log('Before:')
  before.rows.forEach(row => console.log('  "' + row.wheels + '":', row.count))

  // The problematic values use two single quotes (0027 0027): 19''
  // We want to change them to inch symbol (0022): 19"

  // Using parameterized queries to avoid escaping issues
  const fix19 = await client.execute({
    sql: `UPDATE "Order" SET wheels = ? WHERE wheels = ?`,
    args: ['19"', "19''"]
  })
  console.log("\n19'' -> 19\":", fix19.rowsAffected)

  const fix20 = await client.execute({
    sql: `UPDATE "Order" SET wheels = ? WHERE wheels = ?`,
    args: ['20"', "20''"]
  })
  console.log("20'' -> 20\":", fix20.rowsAffected)

  const fix21 = await client.execute({
    sql: `UPDATE "Order" SET wheels = ? WHERE wheels = ?`,
    args: ['21"', "21''"]
  })
  console.log("21'' -> 21\":", fix21.rowsAffected)

  // Verify
  const after = await client.execute(`
    SELECT wheels, COUNT(*) as count
    FROM "Order"
    GROUP BY wheels
    ORDER BY count DESC
  `)
  console.log('\nAfter:')
  after.rows.forEach(row => console.log('  "' + row.wheels + '":', row.count))
}

fixWheelsQuotes().catch(console.error)
