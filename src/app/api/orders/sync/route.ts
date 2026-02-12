import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { SyncResult } from '@/lib/types'

const SPREADSHEET_ID = '1--3lNLMSUDwxgcpqrYh4Fbz8LONLBfbJwOIftKgzaSA'

// All Benutzerdaten sheets with their GIDs
// To find a GID: Open the sheet tab in browser, look at URL for #gid=XXXXXXXX
// NOTE: GID 1610681959 was a statistics sheet, not user data!
// Q3 has different column structure: Option Code in T, Delivery Date in U
const SHEET_GIDS = [
  { gid: '0', label: 'Q3 2025', isQ3: true },        // Benutzerdaten Q3 - 174 users (different columns!)
  { gid: '957284045', label: 'Q4 2025', isQ3: false },            // Benutzerdaten Q4
  { gid: '1666102380', label: 'Current Quarter', isQ3: false },   // Benutzerdaten Q1 2026 - 108 users
]

// Default single sheet for regular sync
const DEFAULT_SHEET_GID = '1666102380'

// Column indices (0-based) based on the spreadsheet structure
// Standard columns for Q4/Q1 sheets
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

// Q3 sheet has different structure: Option Code in T (19), Delivery Date in U (20)
const COLUMNS_Q3 = {
  ...COLUMNS,
  // Q3-specific: Delivery date is in column U (20), not T (19)
  deliveryDate: 20,
  // orderToDelivery is in V (21) for Q3
  orderToDelivery: 21,
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

async function fetchCSV(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`

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

// Sync a single sheet and return result
async function syncSheet(gid: string, label: string, isQ3: boolean = false): Promise<SyncResult & { sheetLabel: string }> {
  // Use Q3-specific columns if needed
  const cols = isQ3 ? COLUMNS_Q3 : COLUMNS
  const result: SyncResult & { sheetLabel: string } = {
    sheetLabel: label,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  }

  const csvText = await fetchCSV(gid)
  const rows = parseCSV(csvText)

  console.log(`[Sync ${label}] GID: ${gid}`)
  console.log(`[Sync ${label}] Total rows parsed: ${rows.length}`)

  if (rows.length < 2) {
    result.errors.push(`No data rows found in sheet ${label}`)
    return result
  }

  // Find header row - look for row containing expected headers like "Name" or "Bestelldatum"
  let headerRowIndex = 0
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i]
    const rowLower = row.map(c => c.toLowerCase())
    // Check if this row contains typical header values
    if (rowLower.some(c => c.includes('name') || c.includes('bestelldatum') || c.includes('modell'))) {
      headerRowIndex = i
      console.log(`[Sync ${label}] Found header row at index ${i}`)
      break
    }
  }

  // Log header row for debugging
  if (rows[headerRowIndex]) {
    console.log(`[Sync ${label}] Header row columns: ${rows[headerRowIndex].length}`)
    console.log(`[Sync ${label}] Headers: ${rows[headerRowIndex].join(' | ')}`)
  }

  // Skip to data rows (after header)
  const dataRows = rows.slice(headerRowIndex + 1)

  // Log data rows info
  console.log(`[Sync ${label}] Data rows (after header): ${dataRows.length}`)

  // Log first 3 data rows for debugging
  dataRows.slice(0, 3).forEach((row, i) => {
    console.log(`[Sync ${label}] Row ${i + 1}: Name="${row[cols.name] || ''}", Cols=${row.length}`)
  })

  // Filter out empty rows
  const validRows = dataRows.filter(row => {
    const name = cleanValue(row[cols.name])
    return name && name.length > 0
  })

  console.log(`[Sync ${label}] Valid rows with names: ${validRows.length}`)

  // Log first valid row for debugging
  if (validRows.length > 0) {
    const sampleRow = validRows[0]
    console.log(`[Sync ${label}] Sample row - Name: "${sampleRow[cols.name]}", OrderDate: "${sampleRow[cols.orderDate]}", Country: "${sampleRow[cols.country]}"`)
    if (isQ3) {
      console.log(`[Sync ${label}] Q3 delivery date column (U/20): "${sampleRow[cols.deliveryDate]}"`)
    }
  }

  for (const row of validRows) {
    const name = cleanValue(row[cols.name])
    const orderDate = cleanValue(row[cols.orderDate])

    if (!name) {
      result.skipped++
      continue
    }

    const orderData = {
      name,
      orderDate,
      country: cleanValue(row[cols.country]),
      model: cleanValue(row[cols.model])?.toLowerCase() || null,  // Normalize to lowercase
      drive: cleanValue(row[cols.drive]),
      color: cleanValue(row[cols.color]),
      interior: cleanValue(row[cols.interior]),
      wheels: cleanValue(row[cols.wheels]),
      towHitch: cleanValue(row[cols.towHitch]),
      autopilot: cleanValue(row[cols.autopilot]),
      deliveryWindow: cleanValue(row[cols.deliveryWindow]),
      deliveryLocation: cleanValue(row[cols.deliveryLocation]),
      vin: cleanValue(row[cols.vin]),
      vinReceivedDate: cleanValue(row[cols.vinReceivedDate]),
      papersReceivedDate: cleanValue(row[cols.papersReceivedDate]),
      productionDate: cleanValue(row[cols.productionDate]),
      typeApproval: cleanValue(row[cols.typeApproval]),
      typeVariant: cleanValue(row[cols.typeVariant]),
      deliveryDate: cleanValue(row[cols.deliveryDate]),
      orderToProduction: parseNumber(row[cols.orderToProduction]),
      orderToVin: parseNumber(row[cols.orderToVin]),
      orderToDelivery: parseNumber(row[cols.orderToDelivery]),
      orderToPapers: parseNumber(row[cols.orderToPapers]),
      papersToDelivery: parseNumber(row[cols.papersToDelivery]),
    }

    try {
      // Check if order exists by name + orderDate
      const existing = await prisma.order.findFirst({
        where: {
          name: name,
          orderDate: orderDate,
        }
      })

      if (existing) {
        // Update existing order - preserve editCode and range!
        await prisma.order.update({
          where: { id: existing.id },
          data: orderData,
          // Note: range field is NOT in orderData, so existing range is preserved
        })
        result.updated++
      } else {
        // Create new order - set default range based on model
        const model = orderData.model || ''
        const isStandard = model === 'standard'
        // Use internal codes: 'maximale_reichweite' or 'standard'
        const defaultRange = isStandard ? 'standard' : 'maximale_reichweite'
        await prisma.order.create({
          data: {
            ...orderData,
            range: defaultRange,
          },
        })
        result.created++
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(`Failed to sync ${name}: ${errorMsg}`)
      result.skipped++
    }
  }

  return result
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    // Check if multi-sheet sync is requested
    const { searchParams } = new URL(request.url)
    const syncAll = searchParams.get('all') === 'true'

    if (syncAll) {
      // Multi-sheet sync - sync all historical data sheets
      const sheetResults: (SyncResult & { sheetLabel: string })[] = []

      for (const sheet of SHEET_GIDS) {
        const sheetResult = await syncSheet(sheet.gid, sheet.label, sheet.isQ3)
        sheetResults.push(sheetResult)
      }

      // Aggregate results
      const totalResult: SyncResult & { sheets: typeof sheetResults } = {
        created: sheetResults.reduce((sum, r) => sum + r.created, 0),
        updated: sheetResults.reduce((sum, r) => sum + r.updated, 0),
        skipped: sheetResults.reduce((sum, r) => sum + r.skipped, 0),
        errors: sheetResults.flatMap(r => r.errors),
        sheets: sheetResults,
      }

      // Update settings with sync info
      await prisma.settings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          lastSyncTime: new Date(),
          lastSyncCount: totalResult.created + totalResult.updated,
        },
        update: {
          lastSyncTime: new Date(),
          lastSyncCount: totalResult.created + totalResult.updated,
        },
      })

      return NextResponse.json(totalResult)
    } else {
      // Single sheet sync (default - current quarter only)
      const result = await syncSheet(DEFAULT_SHEET_GID, 'Current Quarter')

      // Update settings with sync info
      await prisma.settings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          lastSyncTime: new Date(),
          lastSyncCount: result.created + result.updated,
        },
        update: {
          lastSyncTime: new Date(),
          lastSyncCount: result.created + result.updated,
        },
      })

      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Sync failed:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Sync failed: ${errorMsg}` }, { status: 500 })
  }
}
