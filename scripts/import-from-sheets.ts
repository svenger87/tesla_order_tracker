import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { randomBytes } from 'crypto'
import { resolve } from 'path'

const SPREADSHEET_ID = '1--3lNLMSUDwxgcpqrYh4Fbz8LONLBfbJwOIftKgzaSA'
const SHEET_GID = '1666102380'

// Column indices (0-based) based on the spreadsheet structure
const COLUMNS = {
  name: 0,
  orderDate: 1,
  country: 2,
  model: 3,
  drive: 4,
  color: 5,
  interior: 6,
  wheels: 7,
  towHitch: 8,
  autopilot: 9,
  deliveryWindow: 10,
  deliveryLocation: 11,
  vin: 12,
  vinReceivedDate: 13,
  // Column 14 is blank
  papersReceivedDate: 15,
  productionDate: 16,
  typeApproval: 17,
  typeVariant: 18,
  deliveryDate: 19,
  // Column 20 is blank
  orderToProduction: 21,
  orderToVin: 22,
  orderToDelivery: 23,
  orderToPapers: 24,
  papersToDelivery: 25,
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
        i++ // Skip the escaped quote
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
        if (char === '\r') i++ // Skip \n after \r
      } else if (char !== '\r') {
        currentCell += char
      }
    }
  }

  // Handle last row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some(cell => cell !== '')) {
      rows.push(currentRow)
    }
  }

  return rows
}

function cleanValue(value: string | undefined): string | null {
  if (!value || value === '-' || value === '') return null
  return value.trim()
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value === '-' || value === '') return null
  const num = parseInt(value, 10)
  return isNaN(num) ? null : num
}

function generateEditCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

async function fetchCSV(): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`

  console.log('Fetching CSV from Google Sheets...')
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
  }

  return response.text()
}

async function main() {
  console.log('Starting Google Sheets import...\n')

  // Fetch CSV data
  const csvText = await fetchCSV()
  console.log(`Fetched ${csvText.length} bytes of CSV data\n`)

  // Parse CSV
  const rows = parseCSV(csvText)
  console.log(`Parsed ${rows.length} rows (including header)\n`)

  if (rows.length < 2) {
    console.log('No data rows found!')
    return
  }

  // Skip header row
  const dataRows = rows.slice(1)

  // Filter out empty rows (rows where name is empty or only has "nein" in AHK)
  const validRows = dataRows.filter(row => {
    const name = cleanValue(row[COLUMNS.name])
    return name && name.length > 0
  })

  console.log(`Found ${validRows.length} valid order records\n`)

  // Initialize Prisma - use the same path format as the app
  const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db'
  console.log(`Using database URL: ${dbUrl}`)

  const adapter = new PrismaLibSql({ url: dbUrl })
  const prisma = new PrismaClient({ adapter })

  try {
    // Clear existing orders (optional - comment out if you want to append)
    console.log('Clearing existing orders...')
    await prisma.order.deleteMany()
    console.log('Existing orders cleared.\n')

    // Import orders
    let imported = 0
    let skipped = 0

    for (const row of validRows) {
      const name = cleanValue(row[COLUMNS.name])

      if (!name) {
        skipped++
        continue
      }

      try {
        await prisma.order.create({
          data: {
            editCode: generateEditCode(),
            name,
            orderDate: cleanValue(row[COLUMNS.orderDate]),
            country: cleanValue(row[COLUMNS.country]),
            model: cleanValue(row[COLUMNS.model]),
            drive: cleanValue(row[COLUMNS.drive]),
            color: cleanValue(row[COLUMNS.color]),
            interior: cleanValue(row[COLUMNS.interior]),
            wheels: cleanValue(row[COLUMNS.wheels]),
            towHitch: cleanValue(row[COLUMNS.towHitch]),
            autopilot: cleanValue(row[COLUMNS.autopilot]),
            deliveryWindow: cleanValue(row[COLUMNS.deliveryWindow]),
            deliveryLocation: cleanValue(row[COLUMNS.deliveryLocation]),
            vin: cleanValue(row[COLUMNS.vin]),
            vinReceivedDate: cleanValue(row[COLUMNS.vinReceivedDate]),
            papersReceivedDate: cleanValue(row[COLUMNS.papersReceivedDate]),
            productionDate: cleanValue(row[COLUMNS.productionDate]),
            typeApproval: cleanValue(row[COLUMNS.typeApproval]),
            typeVariant: cleanValue(row[COLUMNS.typeVariant]),
            deliveryDate: cleanValue(row[COLUMNS.deliveryDate]),
            orderToProduction: parseNumber(row[COLUMNS.orderToProduction]),
            orderToVin: parseNumber(row[COLUMNS.orderToVin]),
            orderToDelivery: parseNumber(row[COLUMNS.orderToDelivery]),
            orderToPapers: parseNumber(row[COLUMNS.orderToPapers]),
            papersToDelivery: parseNumber(row[COLUMNS.papersToDelivery]),
          }
        })
        imported++

        if (imported % 10 === 0) {
          console.log(`Imported ${imported} orders...`)
        }
      } catch (error) {
        console.error(`Failed to import order for ${name}:`, error)
        skipped++
      }
    }

    console.log(`\n✅ Import complete!`)
    console.log(`   Imported: ${imported} orders`)
    console.log(`   Skipped: ${skipped} rows`)

    // Show sample of imported data
    const sampleOrders = await prisma.order.findMany({ take: 5 })
    console.log('\nSample imported orders:')
    sampleOrders.forEach(order => {
      console.log(`  - ${order.name} (${order.orderDate}) - ${order.model || 'Unknown model'}`)
    })

  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
