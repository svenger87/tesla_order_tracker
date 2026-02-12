import { createClient } from '@libsql/client'

async function migrate() {
  const client = createClient({ url: 'file:./prisma/dev.db' })

  try {
    // Check if column already exists
    const tableInfo = await client.execute('PRAGMA table_info("Order")')
    const columnExists = tableInfo.rows.some(row => row.name === 'range')

    if (columnExists) {
      console.log('Column "range" already exists')
    } else {
      await client.execute('ALTER TABLE "Order" ADD COLUMN "range" TEXT')
      console.log('Added "range" column')
    }

    // Update existing non-Performance entries to "Maximale Reichweite"
    const result = await client.execute(`
      UPDATE "Order"
      SET "range" = 'Maximale Reichweite'
      WHERE ("model" IS NULL OR "model" != 'Performance')
        AND "range" IS NULL
    `)
    console.log('Updated rows to Maximale Reichweite:', result.rowsAffected)

    // Verify
    const counts = await client.execute(`
      SELECT "range", COUNT(*) as count
      FROM "Order"
      GROUP BY "range"
    `)
    console.log('Range distribution:', counts.rows)

  } finally {
    client.close()
  }
}

migrate().catch(console.error)
