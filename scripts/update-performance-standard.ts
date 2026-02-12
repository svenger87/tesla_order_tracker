import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function updateModels() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  console.log('Connected to Turso\n')

  // 1. Performance -> Maximale Reichweite
  const perfCount = await client.execute(
    `SELECT COUNT(*) as count FROM "Order" WHERE model = 'Performance'`
  )
  console.log('Performance models:', perfCount.rows[0].count)
  
  const perfRangeResult = await client.execute(
    `UPDATE "Order" SET range = 'Maximale Reichweite' WHERE model = 'Performance'`
  )
  console.log('  -> Set range to "Maximale Reichweite":', perfRangeResult.rowsAffected)

  // 2. Performance -> 21" wheels
  const perfWheelsResult = await client.execute(
    `UPDATE "Order" SET wheels = '21"' WHERE model = 'Performance' AND (wheels IS NULL OR wheels = '')`
  )
  console.log('  -> Set wheels to 21":', perfWheelsResult.rowsAffected)

  // 3. Standard -> 18" wheels  
  const stdCount = await client.execute(
    `SELECT COUNT(*) as count FROM "Order" WHERE model = 'Standard'`
  )
  console.log('\nStandard models:', stdCount.rows[0].count)

  const stdWheelsResult = await client.execute(
    `UPDATE "Order" SET wheels = '18"' WHERE model = 'Standard' AND (wheels IS NULL OR wheels = '')`
  )
  console.log('  -> Set wheels to 18":', stdWheelsResult.rowsAffected)

  // Verify
  console.log('\n--- Verification ---')
  const verify1 = await client.execute(
    `SELECT COUNT(*) as count FROM "Order" WHERE model = 'Performance' AND range = 'Maximale Reichweite'`
  )
  console.log('Performance with Maximale Reichweite:', verify1.rows[0].count)

  const verify2 = await client.execute(
    `SELECT COUNT(*) as count FROM "Order" WHERE model = 'Performance' AND wheels = '21"'`
  )
  console.log('Performance with 21" wheels:', verify2.rows[0].count)

  const verify3 = await client.execute(
    `SELECT COUNT(*) as count FROM "Order" WHERE model = 'Standard' AND wheels = '18"'`
  )
  console.log('Standard with 18" wheels:', verify3.rows[0].count)
}

updateModels().catch(console.error)
