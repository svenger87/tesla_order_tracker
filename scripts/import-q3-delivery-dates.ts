import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

const SPREADSHEET_ID = '1--3lNLMSUDwxgcpqrYh4Fbz8LONLBfbJwOIftKgzaSA'

async function importQ3DeliveryDates() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  console.log('=== Importing Q3 Delivery Dates from Column U ===\n')

  // Fetch Q3 sheet (gid=0)
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  })

  const csvText = await response.text()
  const rows = parseCSV(csvText)

  console.log(`Total rows: ${rows.length}`)

  // Q3 columns - delivery date is in column U (20)
  const COL_NAME = 0
  const COL_ORDER_DATE = 1
  const COL_DELIVERY_DATE = 20  // Column U

  let updated = 0
  let notFound = 0
  let noDeliveryDate = 0

  // Skip header rows (first 5 rows based on earlier analysis)
  for (let i = 5; i < rows.length; i++) {
    const row = rows[i]
    const name = row[COL_NAME]?.trim()
    const orderDate = row[COL_ORDER_DATE]?.trim()
    const deliveryDate = row[COL_DELIVERY_DATE]?.trim()

    if (!name || !orderDate) continue

    // Check if it's a valid date format (DD.MM.YYYY)
    if (!deliveryDate || !deliveryDate.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      noDeliveryDate++
      continue
    }

    // Update in database
    const result = await client.execute({
      sql: `UPDATE "Order" SET deliveryDate = ? WHERE name = ? AND orderDate = ?`,
      args: [deliveryDate, name, orderDate]
    })

    if (result.rowsAffected > 0) {
      console.log(`  Updated: ${name} -> ${deliveryDate}`)
      updated++
    } else {
      console.log(`  Not found: ${name} (${orderDate})`)
      notFound++
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Updated: ${updated}`)
  console.log(`Not found in DB: ${notFound}`)
  console.log(`No delivery date: ${noDeliveryDate}`)

  // Verify some updates
  console.log('\n=== Verification ===')
  const verify = await client.execute(`
    SELECT name, orderDate, deliveryDate
    FROM "Order"
    WHERE (orderDate LIKE '%07.2025' OR orderDate LIKE '%08.2025' OR orderDate LIKE '%09.2025')
      AND deliveryDate IS NOT NULL
    LIMIT 10
  `)
  verify.rows.forEach(row => console.log(`  ${row.name}: ${row.deliveryDate}`))
}

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        currentCell += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentCell.trim())
        currentCell = ''
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentCell.trim())
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow)
        }
        currentRow = []
        currentCell = ''
        if (char === '\r') i++
      } else if (char !== '\r') {
        currentCell += char
      }
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some(cell => cell !== '')) {
      rows.push(currentRow)
    }
  }

  return rows
}

importQ3DeliveryDates().catch(console.error)
