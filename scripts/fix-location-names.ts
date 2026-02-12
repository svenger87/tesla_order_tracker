import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Mapping of non-German names to German names
const LOCATION_NAME_FIXES: Record<string, string> = {
  // Swedish cities
  'Gothenburg': 'Göteborg',

  // Polish cities (German names)
  'Warsaw': 'Warschau',
  'Wroclaw': 'Breslau', // Or keep Wroclaw if preferred
  'Poznan': 'Posen', // Or keep Poznan if preferred
  'Katowice': 'Kattowitz', // Or keep Katowice if preferred

  // Czech cities
  'Brno': 'Brünn',

  // Croatian cities
  'Zagreb': 'Zagreb', // Same in German

  // Romanian cities
  'Bukarest': 'Bukarest', // Same in German
}

// Actually, let's be more conservative - only fix obvious English names
const CONSERVATIVE_FIXES: Record<string, string> = {
  'Gothenburg': 'Göteborg',
  'Warsaw': 'Warschau', // Already have Warschau, this is a duplicate
}

async function fixLocationNames() {
  console.log('=== Fixing Delivery Location Names ===\n')

  // Step 1: Show current locations
  console.log('Current delivery locations:')
  const currentResult = await turso.execute(
    'SELECT label FROM "Option" WHERE type = \'deliveryLocation\' AND isActive = 1 ORDER BY label'
  )
  currentResult.rows.forEach(r => console.log(`  - ${r.label}`))
  console.log(`\nTotal: ${currentResult.rows.length} locations\n`)

  // Step 2: Apply fixes
  console.log('Applying fixes...')
  for (const [oldName, newName] of Object.entries(CONSERVATIVE_FIXES)) {
    // Update orders
    const orderResult = await turso.execute({
      sql: 'UPDATE "Order" SET deliveryLocation = ? WHERE deliveryLocation = ?',
      args: [newName, oldName]
    })
    if (orderResult.rowsAffected > 0) {
      console.log(`  Orders: "${oldName}" → "${newName}" (${orderResult.rowsAffected} updated)`)
    }

    // Update options
    const optionResult = await turso.execute({
      sql: 'UPDATE "Option" SET value = ?, label = ? WHERE type = \'deliveryLocation\' AND label = ?',
      args: [newName, newName, oldName]
    })
    if (optionResult.rowsAffected > 0) {
      console.log(`  Option: "${oldName}" → "${newName}"`)
    }
  }

  // Step 3: Remove duplicates (e.g., if both Warsaw and Warschau exist)
  console.log('\nChecking for duplicates...')
  const duplicateCheck = await turso.execute(
    'SELECT label, COUNT(*) as cnt FROM "Option" WHERE type = \'deliveryLocation\' GROUP BY label HAVING cnt > 1'
  )
  if (duplicateCheck.rows.length > 0) {
    console.log('  Duplicates found:')
    duplicateCheck.rows.forEach(r => console.log(`    - ${r.label}: ${r.cnt} entries`))
  } else {
    console.log('  No duplicates found')
  }

  // Step 4: Show final locations
  console.log('\n=== Final Delivery Locations ===')
  const finalResult = await turso.execute(
    'SELECT label FROM "Option" WHERE type = \'deliveryLocation\' AND isActive = 1 ORDER BY label'
  )
  finalResult.rows.forEach(r => console.log(`  - ${r.label}`))
  console.log(`\nTotal: ${finalResult.rows.length} locations`)
}

fixLocationNames()
  .catch(console.error)
  .finally(() => process.exit(0))
