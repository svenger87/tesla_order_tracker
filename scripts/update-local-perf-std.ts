import { createClient } from '@libsql/client'

async function updateModels() {
  const client = createClient({ url: 'file:./prisma/dev.db' })

  // Performance -> Maximale Reichweite
  const perfResult = await client.execute(
    `UPDATE "Order" SET range = 'Maximale Reichweite' WHERE model = 'Performance'`
  )
  console.log('Local: Performance set to Maximale Reichweite:', perfResult.rowsAffected)
}

updateModels().catch(console.error)
