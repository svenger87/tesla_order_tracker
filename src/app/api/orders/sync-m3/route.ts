import { queryOne, execute, generateId, nowISO } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { SyncResult, MODEL_3_TOW_HITCH_AVAILABLE } from '@/lib/types'

const MODEL_3_SPREADSHEET_ID = '10fQS1HdBFnvSEVDyP8ofgXerxT1RVoVYUJfagyn95DA'

const MODEL_3_SHEET_GIDS = [
  { gid: '1666102380', label: 'Model 3 Data' },
]

const COLUMNS_M3 = {
  name: 0, orderDate: 1, country: 2, model: 3, drive: 4, battery: 5,
  color: 6, interior: 7, wheels: 8, towHitch: 9, autopilot: 10,
  deliveryWindow: 11, deliveryLocation: 12, vin: 13, vinReceivedDate: 14,
  papersReceivedDate: 16, productionDate: 17, typeApproval: 18,
  typeVariant: 19, deliveryDate: 20,
  orderToProduction: 22, orderToVin: 23, orderToDelivery: 24,
  orderToPapers: 25, papersToDelivery: 26,
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

function cleanValue(value: string | undefined): string | null {
  if (!value || value === '-' || value === '—' || value === '') return null
  return value.trim()
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value === '-' || value === '—' || value === '') return null
  const num = parseInt(value, 10)
  return isNaN(num) ? null : num
}

function mapBatteryToRange(battery: string | null, model: string | null): string | null {
  if (model?.toLowerCase().includes('performance')) return 'maximale_reichweite'
  if (!battery) return null
  const batteryLower = battery.toLowerCase().trim()
  if (batteryLower === 'max' || batteryLower === 'maximale reichweite') return 'maximale_reichweite'
  if (batteryLower === 'std' || batteryLower === 'standard') return 'standard'
  return null
}

function mapTowHitch(towHitch: string | null, model: string | null): string | null {
  const modelLower = model?.toLowerCase() || ''
  const trimKey = modelLower.includes('performance') ? 'performance'
    : modelLower.includes('premium') ? 'premium'
    : modelLower.includes('standard') ? 'standard'
    : null
  if (trimKey && MODEL_3_TOW_HITCH_AVAILABLE[trimKey] === false) return '-'
  return towHitch
}

function normalizeCountry(country: string | null): string | null {
  if (!country) return null
  const cleaned = country.replace(/[\u{1F1E0}-\u{1F1FF}]+/gu, '').trim().toLowerCase()
  const countryMap: Record<string, string> = {
    'deutschland': 'de', 'germany': 'de', 'österreich': 'at', 'austria': 'at',
    'schweiz': 'ch', 'switzerland': 'ch', 'niederlande': 'nl', 'netherlands': 'nl',
    'nederland': 'nl', 'belgien': 'be', 'belgium': 'be', 'frankreich': 'fr',
    'france': 'fr', 'italien': 'it', 'italy': 'it', 'spanien': 'es', 'spain': 'es',
    'portugal': 'pt', 'polen': 'pl', 'poland': 'pl', 'dänemark': 'dk', 'denmark': 'dk',
    'schweden': 'se', 'sweden': 'se', 'norwegen': 'no', 'norway': 'no',
    'finnland': 'fi', 'finland': 'fi', 'uk': 'uk', 'großbritannien': 'uk',
    'slovenia': 'si', 'slowenien': 'si', 'tschechien': 'cz', 'czech': 'cz',
    'ungarn': 'hu', 'hungary': 'hu', 'irland': 'ie', 'ireland': 'ie',
    'luxemburg': 'lu', 'luxembourg': 'lu',
  }
  return countryMap[cleaned] || cleaned
}

function normalizeWheels(wheels: string | null): string | null {
  if (!wheels) return null
  const match = wheels.match(/(\d{2})/)
  return match ? match[1] : wheels
}

function normalizeColor(color: string | null): string | null {
  if (!color) return null
  const colorMap: Record<string, string> = {
    'pearl white': 'pearl_white', 'diamond black': 'diamond_black',
    'stealth grey': 'stealth_grey', 'quicksilver': 'quicksilver',
    'ultra red': 'ultra_red', 'marine blue': 'marine_blue',
  }
  return colorMap[color.toLowerCase()] || color.toLowerCase().replace(/\s+/g, '_')
}

function normalizeDrive(drive: string | null): string | null {
  if (!drive) return null
  return drive.toLowerCase()
}

function normalizeInterior(interior: string | null): string | null {
  if (!interior) return null
  const interiorMap: Record<string, string> = {
    'schwarz': 'black', 'weiß': 'white', 'black': 'black', 'white': 'white',
  }
  return interiorMap[interior.toLowerCase()] || interior.toLowerCase()
}

function normalizeAutopilot(autopilot: string | null): string | null {
  if (!autopilot) return null
  return autopilot.toLowerCase()
}

function normalizeTowHitchValue(towHitch: string | null): string | null {
  if (!towHitch) return null
  const val = towHitch.toLowerCase()
  if (val === 'ja' || val === 'yes') return 'ja'
  if (val === 'nein' || val === 'no') return 'nein'
  return val
}

async function fetchCSV(spreadsheetId: string, gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

async function syncModel3Sheet(gid: string, label: string): Promise<SyncResult & { sheetLabel: string }> {
  const cols = COLUMNS_M3
  const result: SyncResult & { sheetLabel: string } = {
    sheetLabel: label, created: 0, updated: 0, skipped: 0, errors: []
  }

  const csvText = await fetchCSV(MODEL_3_SPREADSHEET_ID, gid)
  const rows = parseCSV(csvText)

  console.log(`[Sync M3 ${label}] GID: ${gid}`)
  console.log(`[Sync M3 ${label}] Total rows parsed: ${rows.length}`)

  if (rows.length < 2) {
    result.errors.push(`No data rows found in sheet ${label}`)
    return result
  }

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

  if (rows[headerRowIndex]) {
    console.log(`[Sync M3 ${label}] Header row columns: ${rows[headerRowIndex].length}`)
    console.log(`[Sync M3 ${label}] Headers: ${rows[headerRowIndex].join(' | ')}`)
  }

  const dataRows = rows.slice(headerRowIndex + 1)
  console.log(`[Sync M3 ${label}] Data rows (after header): ${dataRows.length}`)

  dataRows.slice(0, 3).forEach((row, i) => {
    console.log(`[Sync M3 ${label}] Row ${i + 1}: Name="${row[cols.name] || ''}", Model="${row[cols.model] || ''}", Akku="${row[cols.battery] || ''}"`)
  })

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
    const model = modelRaw?.toLowerCase() || null
    const battery = cleanValue(row[cols.battery])
    const range = mapBatteryToRange(battery, model)

    const orderData = {
      name, vehicleType: 'Model 3' as const, orderDate,
      country: normalizeCountry(cleanValue(row[cols.country])),
      model, range,
      drive: normalizeDrive(cleanValue(row[cols.drive])),
      color: normalizeColor(cleanValue(row[cols.color])),
      interior: normalizeInterior(cleanValue(row[cols.interior])),
      wheels: normalizeWheels(cleanValue(row[cols.wheels])),
      towHitch: mapTowHitch(normalizeTowHitchValue(cleanValue(row[cols.towHitch])), model),
      autopilot: normalizeAutopilot(cleanValue(row[cols.autopilot])),
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
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM "Order" WHERE name = ? AND orderDate ${orderDate ? '= ?' : 'IS NULL'} AND vehicleType = 'Model 3' LIMIT 1`,
        orderDate ? [name, orderDate] : [name],
      )

      if (existing) {
        const now = nowISO()
        await execute(
          `UPDATE "Order" SET name = ?, vehicleType = ?, orderDate = ?, country = ?, model = ?, range = ?, drive = ?, color = ?, interior = ?, wheels = ?, towHitch = ?, autopilot = ?, deliveryWindow = ?, deliveryLocation = ?, vin = ?, vinReceivedDate = ?, papersReceivedDate = ?, productionDate = ?, typeApproval = ?, typeVariant = ?, deliveryDate = ?, orderToProduction = ?, orderToVin = ?, orderToDelivery = ?, orderToPapers = ?, papersToDelivery = ?, updatedAt = ? WHERE id = ?`,
          [
            orderData.name, orderData.vehicleType, orderData.orderDate,
            orderData.country, orderData.model, orderData.range, orderData.drive,
            orderData.color, orderData.interior, orderData.wheels, orderData.towHitch,
            orderData.autopilot, orderData.deliveryWindow, orderData.deliveryLocation,
            orderData.vin, orderData.vinReceivedDate, orderData.papersReceivedDate,
            orderData.productionDate, orderData.typeApproval, orderData.typeVariant,
            orderData.deliveryDate, orderData.orderToProduction, orderData.orderToVin,
            orderData.orderToDelivery, orderData.orderToPapers, orderData.papersToDelivery,
            now, existing.id,
          ],
        )
        result.updated++
      } else {
        const now = nowISO()
        await execute(
          `INSERT INTO "Order" (id, name, vehicleType, orderDate, country, model, range, drive, color, interior, wheels, towHitch, autopilot, deliveryWindow, deliveryLocation, vin, vinReceivedDate, papersReceivedDate, productionDate, typeApproval, typeVariant, deliveryDate, orderToProduction, orderToVin, orderToDelivery, orderToPapers, papersToDelivery, archived, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [
            generateId(), orderData.name, orderData.vehicleType, orderData.orderDate,
            orderData.country, orderData.model, orderData.range, orderData.drive,
            orderData.color, orderData.interior, orderData.wheels, orderData.towHitch,
            orderData.autopilot, orderData.deliveryWindow, orderData.deliveryLocation,
            orderData.vin, orderData.vinReceivedDate, orderData.papersReceivedDate,
            orderData.productionDate, orderData.typeApproval, orderData.typeVariant,
            orderData.deliveryDate, orderData.orderToProduction, orderData.orderToVin,
            orderData.orderToDelivery, orderData.orderToPapers, orderData.papersToDelivery,
            now, now,
          ],
        )
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

    const totalResult: SyncResult & { sheets: typeof sheetResults } = {
      created: sheetResults.reduce((sum, r) => sum + r.created, 0),
      updated: sheetResults.reduce((sum, r) => sum + r.updated, 0),
      skipped: sheetResults.reduce((sum, r) => sum + r.skipped, 0),
      errors: sheetResults.flatMap(r => r.errors),
      sheets: sheetResults,
    }

    const now = nowISO()
    await execute(
      `INSERT INTO "Settings" (id, lastSyncTime, lastSyncCount, showDonation, donationUrl, donationText, archiveEnabled, archiveThreshold, updatedAt)
       VALUES ('default', ?, ?, 1, 'https://buymeacoffee.com', 'Dieses Projekt unterstützen', 1, 180, ?)
       ON CONFLICT(id) DO UPDATE SET lastSyncTime = excluded.lastSyncTime, lastSyncCount = excluded.lastSyncCount, updatedAt = excluded.updatedAt`,
      [now, totalResult.created + totalResult.updated, now],
    )

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
