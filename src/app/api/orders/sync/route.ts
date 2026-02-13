import { queryOne, execute, generateId, nowISO } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { SyncResult } from '@/lib/types'

const SPREADSHEET_ID = '1--3lNLMSUDwxgcpqrYh4Fbz8LONLBfbJwOIftKgzaSA'

const SHEET_GIDS = [
  { gid: '0', label: 'Q3 2025', isQ3: true },
  { gid: '957284045', label: 'Q4 2025', isQ3: false },
  { gid: '1666102380', label: 'Current Quarter', isQ3: false },
]

const DEFAULT_SHEET_GID = '1666102380'

const COLUMNS = {
  name: 0, orderDate: 1, country: 2, model: 3, drive: 4, color: 5,
  interior: 6, wheels: 7, towHitch: 8, autopilot: 9, deliveryWindow: 10,
  deliveryLocation: 11, vin: 12, vinReceivedDate: 13,
  papersReceivedDate: 15, productionDate: 16, typeApproval: 17,
  typeVariant: 18, deliveryDate: 19,
  orderToProduction: 21, orderToVin: 22, orderToDelivery: 23,
  orderToPapers: 24, papersToDelivery: 25,
}

const COLUMNS_Q3 = {
  ...COLUMNS,
  deliveryDate: 20,
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
  if (!value || value === '-' || value === '') return null
  return value.trim()
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value === '-' || value === '') return null
  const num = parseInt(value, 10)
  return isNaN(num) ? null : num
}

function normalizeColor(color: string | null): string | null {
  if (!color) return null
  return color.toLowerCase().replace(/\s+/g, '_')
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

function normalizeTowHitch(towHitch: string | null): string | null {
  if (!towHitch) return null
  const val = towHitch.toLowerCase()
  if (val === 'ja' || val === 'yes') return 'ja'
  if (val === 'nein' || val === 'no') return 'nein'
  return val
}

function normalizeCountry(country: string | null): string | null {
  if (!country) return null
  const cleaned = country.replace(/[\u{1F1E0}-\u{1F1FF}]+/gu, '').trim().toLowerCase()
  const countryMap: Record<string, string> = {
    'deutschland': 'de', 'germany': 'de', 'österreich': 'at', 'austria': 'at',
    'schweiz': 'ch', 'switzerland': 'ch', 'niederlande': 'nl', 'netherlands': 'nl',
    'belgien': 'be', 'belgium': 'be', 'frankreich': 'fr', 'france': 'fr',
    'italien': 'it', 'italy': 'it', 'spanien': 'es', 'spain': 'es',
    'portugal': 'pt', 'polen': 'pl', 'poland': 'pl', 'dänemark': 'dk',
    'denmark': 'dk', 'schweden': 'se', 'sweden': 'se', 'norwegen': 'no',
    'norway': 'no', 'uk': 'uk', 'großbritannien': 'uk',
  }
  return countryMap[cleaned] || cleaned
}

async function fetchCSV(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

async function syncSheet(gid: string, label: string, isQ3: boolean = false): Promise<SyncResult & { sheetLabel: string }> {
  const cols = isQ3 ? COLUMNS_Q3 : COLUMNS
  const result: SyncResult & { sheetLabel: string } = {
    sheetLabel: label, created: 0, updated: 0, skipped: 0, errors: []
  }

  const csvText = await fetchCSV(gid)
  const rows = parseCSV(csvText)

  console.log(`[Sync ${label}] GID: ${gid}`)
  console.log(`[Sync ${label}] Total rows parsed: ${rows.length}`)

  if (rows.length < 2) {
    result.errors.push(`No data rows found in sheet ${label}`)
    return result
  }

  let headerRowIndex = 0
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i]
    const rowLower = row.map(c => c.toLowerCase())
    if (rowLower.some(c => c.includes('name') || c.includes('bestelldatum') || c.includes('modell'))) {
      headerRowIndex = i
      console.log(`[Sync ${label}] Found header row at index ${i}`)
      break
    }
  }

  if (rows[headerRowIndex]) {
    console.log(`[Sync ${label}] Header row columns: ${rows[headerRowIndex].length}`)
    console.log(`[Sync ${label}] Headers: ${rows[headerRowIndex].join(' | ')}`)
  }

  const dataRows = rows.slice(headerRowIndex + 1)
  console.log(`[Sync ${label}] Data rows (after header): ${dataRows.length}`)

  dataRows.slice(0, 3).forEach((row, i) => {
    console.log(`[Sync ${label}] Row ${i + 1}: Name="${row[cols.name] || ''}", Cols=${row.length}`)
  })

  const validRows = dataRows.filter(row => {
    const name = cleanValue(row[cols.name])
    return name && name.length > 0
  })

  console.log(`[Sync ${label}] Valid rows with names: ${validRows.length}`)

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
      name, orderDate,
      country: normalizeCountry(cleanValue(row[cols.country])),
      model: cleanValue(row[cols.model])?.toLowerCase() || null,
      drive: normalizeDrive(cleanValue(row[cols.drive])),
      color: normalizeColor(cleanValue(row[cols.color])),
      interior: normalizeInterior(cleanValue(row[cols.interior])),
      wheels: cleanValue(row[cols.wheels]),
      towHitch: normalizeTowHitch(cleanValue(row[cols.towHitch])),
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
        `SELECT id FROM "Order" WHERE name = ? AND orderDate ${orderDate ? '= ?' : 'IS NULL'} LIMIT 1`,
        orderDate ? [name, orderDate] : [name],
      )

      if (existing) {
        const now = nowISO()
        await execute(
          `UPDATE "Order" SET name = ?, orderDate = ?, country = ?, model = ?, drive = ?, color = ?, interior = ?, wheels = ?, towHitch = ?, autopilot = ?, deliveryWindow = ?, deliveryLocation = ?, vin = ?, vinReceivedDate = ?, papersReceivedDate = ?, productionDate = ?, typeApproval = ?, typeVariant = ?, deliveryDate = ?, orderToProduction = ?, orderToVin = ?, orderToDelivery = ?, orderToPapers = ?, papersToDelivery = ?, updatedAt = ? WHERE id = ?`,
          [
            orderData.name, orderData.orderDate, orderData.country, orderData.model,
            orderData.drive, orderData.color, orderData.interior, orderData.wheels,
            orderData.towHitch, orderData.autopilot, orderData.deliveryWindow,
            orderData.deliveryLocation, orderData.vin, orderData.vinReceivedDate,
            orderData.papersReceivedDate, orderData.productionDate, orderData.typeApproval,
            orderData.typeVariant, orderData.deliveryDate, orderData.orderToProduction,
            orderData.orderToVin, orderData.orderToDelivery, orderData.orderToPapers,
            orderData.papersToDelivery, now, existing.id,
          ],
        )
        result.updated++
      } else {
        const model = orderData.model || ''
        const isStandard = model === 'standard'
        const defaultRange = isStandard ? 'standard' : 'maximale_reichweite'
        const now = nowISO()
        await execute(
          `INSERT INTO "Order" (id, name, vehicleType, orderDate, country, model, range, drive, color, interior, wheels, towHitch, autopilot, deliveryWindow, deliveryLocation, vin, vinReceivedDate, papersReceivedDate, productionDate, typeApproval, typeVariant, deliveryDate, orderToProduction, orderToVin, orderToDelivery, orderToPapers, papersToDelivery, archived, createdAt, updatedAt)
           VALUES (?, ?, 'Model Y', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [
            generateId(), orderData.name, orderData.orderDate, orderData.country,
            orderData.model, defaultRange, orderData.drive, orderData.color,
            orderData.interior, orderData.wheels, orderData.towHitch, orderData.autopilot,
            orderData.deliveryWindow, orderData.deliveryLocation, orderData.vin,
            orderData.vinReceivedDate, orderData.papersReceivedDate, orderData.productionDate,
            orderData.typeApproval, orderData.typeVariant, orderData.deliveryDate,
            orderData.orderToProduction, orderData.orderToVin, orderData.orderToDelivery,
            orderData.orderToPapers, orderData.papersToDelivery, now, now,
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

async function upsertSyncSettings(count: number) {
  const now = nowISO()
  await execute(
    `INSERT INTO "Settings" (id, lastSyncTime, lastSyncCount, showDonation, donationUrl, donationText, archiveEnabled, archiveThreshold, updatedAt)
     VALUES ('default', ?, ?, 1, 'https://buymeacoffee.com', 'Dieses Projekt unterstützen', 1, 180, ?)
     ON CONFLICT(id) DO UPDATE SET lastSyncTime = excluded.lastSyncTime, lastSyncCount = excluded.lastSyncCount, updatedAt = excluded.updatedAt`,
    [now, count, now],
  )
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const syncAll = searchParams.get('all') === 'true'

    if (syncAll) {
      const sheetResults: (SyncResult & { sheetLabel: string })[] = []

      for (const sheet of SHEET_GIDS) {
        const sheetResult = await syncSheet(sheet.gid, sheet.label, sheet.isQ3)
        sheetResults.push(sheetResult)
      }

      const totalResult: SyncResult & { sheets: typeof sheetResults } = {
        created: sheetResults.reduce((sum, r) => sum + r.created, 0),
        updated: sheetResults.reduce((sum, r) => sum + r.updated, 0),
        skipped: sheetResults.reduce((sum, r) => sum + r.skipped, 0),
        errors: sheetResults.flatMap(r => r.errors),
        sheets: sheetResults,
      }

      await upsertSyncSettings(totalResult.created + totalResult.updated)
      return NextResponse.json(totalResult)
    } else {
      const result = await syncSheet(DEFAULT_SHEET_GID, 'Current Quarter')
      await upsertSyncSettings(result.created + result.updated)
      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Sync failed:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Sync failed: ${errorMsg}` }, { status: 500 })
  }
}
