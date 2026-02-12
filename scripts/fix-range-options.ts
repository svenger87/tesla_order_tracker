import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function fixRangeOptions() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  // Check existing range options
  const options = await client.execute(`SELECT * FROM "Option" WHERE type = 'range' ORDER BY sortOrder`)
  console.log('Range options in admin:', options.rows.length)
  options.rows.forEach(row => console.log('  ', row.value, '->', row.label))

  // Check actual range values in orders
  const ranges = await client.execute(`SELECT range, COUNT(*) as count FROM "Order" GROUP BY range ORDER BY count DESC`)
  console.log('\nRange values in orders:')
  ranges.rows.forEach(row => console.log('  "' + row.range + '":', row.count))

  // Insert range options if missing
  console.log('\n=== Adding range options ===')

  const rangeOptions = [
    { value: 'Maximale Reichweite', label: 'Maximale Reichweite', sortOrder: 1 },
    { value: 'Standard', label: 'Standard', sortOrder: 2 },
  ]

  for (const opt of rangeOptions) {
    try {
      await client.execute({
        sql: `INSERT INTO "Option" (id, type, value, label, sortOrder, isActive) VALUES (?, 'range', ?, ?, ?, true)`,
        args: [`opt_range_${opt.value.toLowerCase().replace(/\s+/g, '_')}`, opt.value, opt.label, opt.sortOrder]
      })
      console.log('Added:', opt.value)
    } catch (e: any) {
      if (e.message?.includes('UNIQUE constraint')) {
        console.log('Already exists:', opt.value)
      } else {
        console.log('Error adding', opt.value, ':', e.message)
      }
    }
  }

  // Verify
  const after = await client.execute(`SELECT * FROM "Option" WHERE type = 'range' ORDER BY sortOrder`)
  console.log('\nRange options after fix:', after.rows.length)
  after.rows.forEach(row => console.log('  ', row.value, '->', row.label))
}

fixRangeOptions().catch(console.error)
