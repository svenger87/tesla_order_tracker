import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { SyncResult, MODEL_3_TOW_HITCH_AVAILABLE } from '@/lib/types'

// Model 3 Spreadsheet
const MODEL_3_SPREADSHEET_ID = '10fQS1HdBFnvSEVDyP8ofgXerxT1RVoVYUJfagyn95DA'

// Model 3 sheets
const MODEL_3_SHEET_GIDS = [
  { gid: '1666102380', label: 'Model 3 Data' },
]

// Column indices for Model 3 sheet (0-based)
// Model 3 has "Akku" column (battery) instead of the Model Y's implicit range
const COLUMNS_M3 = {
  name: 0,              // Name
  orderDate: 1,         // Bestelldatum
  country: 2,           // Land
  model: 3,             // Model (Standard/Premium/Performance)
  drive: 4,             // Antrieb
  battery: 5,           // Akku (Std/Max/-) - maps to range
  color: 6,             // Farbe
  interior: 7,          // Innen
  wheels: 8,            // Felgen
  towHitch: 9,          // AHK
  autopilot: 10,        // Autopilot
  deliveryWindow: 11,   // Lieferfenster
  deliveryLocation: 12, // Ort
  vin: 13,              // VIN
  vinReceivedDate: 14,  // VIN erhalten am
  // Column 15 is empty in the sheet
  papersReceivedDate: 16, // Papiere erhalten am
  productionDate: 17,   // Produktionsdatum
  typeApproval: 18,     // Typgenehmigung
  typeVariant: 19,      // Typ-Variante
  deliveryDate: 20,     // Auslieferungs-datum
  // Column 21: Warten auf VIN (calculated, skip)
  orderToProduction: 22, // Bestellung bis Produktion
  orderToVin: 23,       // Bestellung bis VIN
  orderToDelivery: 24,  // Bestellung bis Lieferung
  orderToPapers: 25,    // Bestellung bis Papiere
  papersToDelivery: 26, // Papiere bis Auslieferung
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
  if (!value || value === '-' || value === '—' || value === '') return null
  return value.trim()
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value === '-' || value === '—' || value === '') return null
  const num = parseInt(value, 10)
  return isNaN(num) ? null : num
}

// Map battery/Akku value to range
function mapBatteryToRange(battery: string | null, model: string | null): string | null {
  // Performance models always have maximum range battery
  if (model?.toLowerCase().includes('performance')) {
    return 'maximale_reichweite'
  }

  if (!battery) return null

  const batteryLower = battery.toLowerCase().trim()
  if (batteryLower === 'max' || batteryLower === 'maximale reichweite') {
    return 'maximale_reichweite'
  }
  if (batteryLower === 'std' || batteryLower === 'standard') {
    return 'standard'
  }

  return null
}

// Map tow hitch - use ruleset to determine availability
function mapTowHitch(towHitch: string | null, model: string | null): string | null {
  const modelLower = model?.toLowerCase() || ''
  // Check ruleset for tow hitch availability
  const trimKey = modelLower.includes('performance') ? 'performance'
    : modelLower.includes('premium') ? 'premium'
    : modelLower.includes('standard') ? 'standard'
    : null

  // If tow hitch not available for this trim, set to "-"
  if (trimKey && MODEL_3_TOW_HITCH_AVAILABLE[trimKey] === false) {
    return '-'
  }
  return towHitch
}

// Normalize country - remove emoji flag if present
function normalizeCountry(country: string | null): string | null {
  if (!country) return null

  // Country format: "🇩🇪 Deutschland" or just "Deutschland"
  // Remove any emoji flags and trim
  const normalized = country.replace(/[\u{1F1E0}-\u{1F1FF}]+/gu, '').trim()
  return normalized || null
}

// Normalize wheels - convert "18''" to "18"
function normalizeWheels(wheels: string | null): string | null {
  if (!wheels) return null

  // Extract just the number: "18''" -> "18", "19 Zoll" -> "19"
  const match = wheels.match(/(\d{2})/)
  return match ? match[1] : wheels
}

async function fetchCSV(spreadsheetId: string, gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`

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

async function syncModel3Sheet(gid: string, label: string): Promise<SyncResult & { sheetLabel: string }> {
  const cols = COLUMNS_M3
  const result: SyncResult & { sheetLabel: string } = {
    sheetLabel: label,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  }

  const csvText = await fetchCSV(MODEL_3_SPREADSHEET_ID, gid)
  const rows = parseCSV(csvText)

  console.log(`[Sync M3 ${label}] GID: ${gid}`)
  console.log(`[Sync M3 ${label}] Total rows parsed: ${rows.length}`)

  if (rows.length < 2) {
    result.errors.push(`No data rows found in sheet ${label}`)
    return result
  }

  // Find header row
  let headerRowIndex = 0
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i]
    const rowLower = row.map(c => c.toLowerCase())
    if (rowLower.some(c => c.includes('name') || c.includes('bestelldatum') || c.includes('model'))) {
      headerRowIndex = i
      console.log(`[Sync M3 ${label}] Found header row at index ${i}`)
      break
    }
  }

  // Log header row for debugging
  if (rows[headerRowIndex]) {
    console.log(`[Sync M3 ${label}] Header row columns: ${rows[headerRowIndex].length}`)
    console.log(`[Sync M3 ${label}] Headers: ${rows[headerRowIndex].join(' | ')}`)
  }

  // Skip to data rows
  const dataRows = rows.slice(headerRowIndex + 1)
  console.log(`[Sync M3 ${label}] Data rows (after header): ${dataRows.length}`)

  // Log first 3 data rows for debugging
  dataRows.slice(0, 3).forEach((row, i) => {
    console.log(`[Sync M3 ${label}] Row ${i + 1}: Name="${row[cols.name] || ''}", Model="${row[cols.model] || ''}", Akku="${row[cols.battery] || ''}"`)
  })

  // Filter out empty rows
  const validRows = dataRows.filter(row => {
    const name = cleanValue(row[cols.name])
    return name && name.length > 0
  })

  console.log(`[Sync M3 ${label}] Valid rows with names: ${validRows.length}`)

  for (const row of validRows) {
    const name = cleanValue(row[cols.name])
    const orderDate = cleanValue(row[cols.orderDate])

    if (!name) {
      result.skipped++
      continue
    }

    const modelRaw = cleanValue(row[cols.model])
    const model = modelRaw?.toLowerCase() || null  // Normalize to lowercase
    const battery = cleanValue(row[cols.battery])
    const range = mapBatteryToRange(battery, model)

    const orderData = {
      name,
      vehicleType: 'Model 3', // All records are Model 3
      orderDate,
      country: normalizeCountry(cleanValue(row[cols.country])),
      model,
      range, // Mapped from battery/Akku
      drive: cleanValue(row[cols.drive]),
      color: cleanValue(row[cols.color]),
      interior: cleanValue(row[cols.interior]),
      wheels: normalizeWheels(cleanValue(row[cols.wheels])),
      towHitch: mapTowHitch(cleanValue(row[cols.towHitch]), model),
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
      // Check if order exists by name + orderDate + vehicleType
      const existing = await prisma.order.findFirst({
        where: {
          name: name,
          orderDate: orderDate,
          vehicleType: 'Model 3',
        }
      })

      if (existing) {
        // Update existing order - preserve editCode
        await prisma.order.update({
          where: { id: existing.id },
          data: orderData,
        })
        result.updated++
      } else {
        // Create new order
        await prisma.order.create({
          data: orderData,
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

    const sheetResults: (SyncResult & { sheetLabel: string })[] = []

    for (const sheet of MODEL_3_SHEET_GIDS) {
      const sheetResult = await syncModel3Sheet(sheet.gid, sheet.label)
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

    return NextResponse.json({
      message: 'Model 3 sync completed',
      vehicleType: 'Model 3',
      ...totalResult,
    })
  } catch (error) {
    console.error('Model 3 sync failed:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Sync failed: ${errorMsg}` }, { status: 500 })
  }
}
