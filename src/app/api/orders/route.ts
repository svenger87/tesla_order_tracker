import { query, queryOne, execute, generateId, nowISO } from '@/lib/db'
import { transformOrderRow, ORDER_PUBLIC_COLS } from '@/lib/db-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { parse, differenceInDays, isValid } from 'date-fns'
import {
  MODEL_3_TOW_HITCH_AVAILABLE,
} from '@/lib/types'

// Helper to parse German date format (DD.MM.YYYY) and calculate days between dates
function parseGermanDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const parsed = parse(dateStr, 'dd.MM.yyyy', new Date())
  return isValid(parsed) ? parsed : null
}

function calculateDaysBetween(fromDate: string | null | undefined, toDate: string | null | undefined): number | null {
  const from = parseGermanDate(fromDate)
  const to = parseGermanDate(toDate)
  if (!from || !to) return null
  return differenceInDays(to, from)
}

// Apply Model 3 constraints - set unavailable options to "-"
function applyModel3Constraints(data: Record<string, unknown>): Record<string, unknown> {
  if (data.vehicleType !== 'Model 3') return data

  const model = (data.model as string)?.toLowerCase() || ''
  const result = { ...data }

  // Performance models always have maximum range
  if (model.includes('performance')) {
    result.range = 'maximale_reichweite'
  }

  // Check tow hitch availability using ruleset
  const trimKey = model.includes('performance') ? 'performance'
    : model.includes('premium') ? 'premium'
    : model.includes('standard') ? 'standard'
    : null

  if (trimKey && MODEL_3_TOW_HITCH_AVAILABLE[trimKey] === false) {
    result.towHitch = '-'
  }

  return result
}

// Calculate all time period fields from dates
function calculateTimePeriods(data: {
  orderDate?: string | null
  productionDate?: string | null
  vinReceivedDate?: string | null
  deliveryDate?: string | null
  papersReceivedDate?: string | null
}) {
  return {
    orderToProduction: calculateDaysBetween(data.orderDate, data.productionDate),
    orderToVin: calculateDaysBetween(data.orderDate, data.vinReceivedDate),
    orderToDelivery: calculateDaysBetween(data.orderDate, data.deliveryDate),
    orderToPapers: calculateDaysBetween(data.orderDate, data.papersReceivedDate),
    papersToDelivery: calculateDaysBetween(data.papersReceivedDate, data.deliveryDate),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    // Check if admin - only admins can see archived orders
    const admin = await getAdminFromCookie()
    const showArchived = admin && includeArchived

    const rows = showArchived
      ? await query<Record<string, unknown>>(`SELECT ${ORDER_PUBLIC_COLS} FROM "Order" ORDER BY createdAt DESC`)
      : await query<Record<string, unknown>>(`SELECT ${ORDER_PUBLIC_COLS} FROM "Order" WHERE archived = 0 ORDER BY createdAt DESC`)

    const orders = rows.map(transformOrderRow)
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    console.error('TURSO_DATABASE_URL set:', !!process.env.TURSO_DATABASE_URL)
    console.error('TURSO_AUTH_TOKEN set:', !!process.env.TURSO_AUTH_TOKEN)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields for vehicle configuration
    const requiredFields = [
      { field: 'name', label: 'Name' },
      { field: 'model', label: 'Model' },
      { field: 'color', label: 'Farbe' },
      { field: 'interior', label: 'Innenraum' },
      { field: 'wheels', label: 'Felgen' },
      { field: 'towHitch', label: 'AHK' },
      { field: 'autopilot', label: 'Autopilot' },
      { field: 'country', label: 'Land' },
      { field: 'deliveryLocation', label: 'Ort (Auslieferung)' },
    ] as const

    for (const { field, label } of requiredFields) {
      if (!body[field] || (typeof body[field] === 'string' && !body[field].trim())) {
        return NextResponse.json(
          { error: `${label} ist erforderlich` },
          { status: 400 }
        )
      }
    }

    // Handle custom password if provided
    let editCode: string | null = null
    if (body.customPassword) {
      if (body.customPassword.length < 6) {
        return NextResponse.json(
          { error: 'Passwort muss mindestens 6 Zeichen lang sein' },
          { status: 400 }
        )
      }
      if (!/\d/.test(body.customPassword)) {
        return NextResponse.json(
          { error: 'Passwort muss mindestens eine Zahl enthalten' },
          { status: 400 }
        )
      }

      // Check uniqueness
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM "Order" WHERE editCode = ?`,
        [body.customPassword],
      )
      if (existing) {
        return NextResponse.json(
          { error: 'Dieses Passwort ist bereits vergeben. Bitte wähle ein anderes.' },
          { status: 400 }
        )
      }

      editCode = body.customPassword
    }

    // Calculate time periods from dates
    const timePeriods = calculateTimePeriods(body)

    // Apply Model 3 constraints (set unavailable options to "-")
    const d = applyModel3Constraints(body)

    const id = generateId()
    const now = nowISO()

    await execute(
      `INSERT INTO "Order" (id, editCode, name, vehicleType, orderDate, country, model, range, drive, color, interior, wheels, towHitch, autopilot, deliveryWindow, deliveryLocation, vin, vinReceivedDate, papersReceivedDate, productionDate, typeApproval, typeVariant, deliveryDate, orderToProduction, orderToVin, orderToDelivery, orderToPapers, papersToDelivery, archived, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        id,
        editCode,
        d.name as string,
        (d.vehicleType as string) || 'Model Y',
        (d.orderDate as string) || null,
        (d.country as string) || null,
        (d.model as string) || null,
        (d.range as string) || null,
        (d.drive as string) || null,
        (d.color as string) || null,
        (d.interior as string) || null,
        (d.wheels as string) || null,
        (d.towHitch as string) || null,
        (d.autopilot as string) || null,
        (d.deliveryWindow as string) || null,
        (d.deliveryLocation as string) || null,
        (d.vin as string) || null,
        (d.vinReceivedDate as string) || null,
        (d.papersReceivedDate as string) || null,
        (d.productionDate as string) || null,
        (d.typeApproval as string) || null,
        (d.typeVariant as string) || null,
        (d.deliveryDate as string) || null,
        timePeriods.orderToProduction,
        timePeriods.orderToVin,
        timePeriods.orderToDelivery,
        timePeriods.orderToPapers,
        timePeriods.papersToDelivery,
        now,
        now,
      ],
    )

    return NextResponse.json({
      id,
      editCode,
      isCustomPassword: !!body.customPassword,
      message: 'Order created successfully'
    })
  } catch (error) {
    console.error('Failed to create order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, editCode, isLegacy, newEditCode, expectedUpdatedAt, ...data } = body

    const admin = await getAdminFromCookie()

    // Check authorization - either admin or valid edit code
    if (!admin) {
      const order = await queryOne<{ id: string; editCode: string | null }>(
        `SELECT id, editCode FROM "Order" WHERE id = ?`,
        [id],
      )

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      // Legacy order flow - user verified via username
      if (isLegacy && order.editCode === null) {
        if (!newEditCode) {
          return NextResponse.json({ error: 'Neues Passwort erforderlich für Bestandseinträge' }, { status: 400 })
        }
        if (newEditCode.length < 6) {
          return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' }, { status: 400 })
        }
        if (!/\d/.test(newEditCode)) {
          return NextResponse.json({ error: 'Passwort muss mindestens eine Zahl enthalten' }, { status: 400 })
        }

        // Check uniqueness
        const existing = await queryOne<{ id: string }>(
          `SELECT id FROM "Order" WHERE editCode = ?`,
          [newEditCode],
        )
        if (existing) {
          return NextResponse.json({ error: 'Dieses Passwort ist bereits vergeben' }, { status: 400 })
        }

        const timePeriods = calculateTimePeriods(data)
        const d = applyModel3Constraints(data)
        const now = nowISO()

        await execute(
          `UPDATE "Order" SET editCode = ?, name = ?, vehicleType = ?, orderDate = ?, country = ?, model = ?, range = ?, drive = ?, color = ?, interior = ?, wheels = ?, towHitch = ?, autopilot = ?, deliveryWindow = ?, deliveryLocation = ?, vin = ?, vinReceivedDate = ?, papersReceivedDate = ?, productionDate = ?, typeApproval = ?, typeVariant = ?, deliveryDate = ?, orderToProduction = ?, orderToVin = ?, orderToDelivery = ?, orderToPapers = ?, papersToDelivery = ?, updatedAt = ? WHERE id = ?`,
          [
            newEditCode,
            d.name as string,
            (d.vehicleType as string) || 'Model Y',
            (d.orderDate as string) || null,
            (d.country as string) || null,
            (d.model as string) || null,
            (d.range as string) || null,
            (d.drive as string) || null,
            (d.color as string) || null,
            (d.interior as string) || null,
            (d.wheels as string) || null,
            (d.towHitch as string) || null,
            (d.autopilot as string) || null,
            (d.deliveryWindow as string) || null,
            (d.deliveryLocation as string) || null,
            (d.vin as string) || null,
            (d.vinReceivedDate as string) || null,
            (d.papersReceivedDate as string) || null,
            (d.productionDate as string) || null,
            (d.typeApproval as string) || null,
            (d.typeVariant as string) || null,
            (d.deliveryDate as string) || null,
            timePeriods.orderToProduction,
            timePeriods.orderToVin,
            timePeriods.orderToDelivery,
            timePeriods.orderToPapers,
            timePeriods.papersToDelivery,
            now,
            id,
          ],
        )

        return NextResponse.json({
          id,
          editCode: newEditCode,
          message: 'Eintrag aktualisiert und neues Passwort gesetzt!',
        })
      }

      // Standard edit code verification
      if (!editCode) {
        return NextResponse.json({ error: 'Edit code required' }, { status: 401 })
      }

      if (order.editCode !== editCode) {
        return NextResponse.json({ error: 'Invalid edit code' }, { status: 401 })
      }
    }

    // Optimistic locking: check if order was modified since user loaded it
    if (expectedUpdatedAt) {
      const currentOrder = await queryOne<{ updatedAt: string }>(
        `SELECT updatedAt FROM "Order" WHERE id = ?`,
        [id],
      )
      if (currentOrder && currentOrder.updatedAt) {
        const expectedTime = new Date(expectedUpdatedAt).getTime()
        const actualTime = new Date(currentOrder.updatedAt).getTime()
        if (actualTime > expectedTime) {
          return NextResponse.json({
            error: 'Dieser Eintrag wurde zwischenzeitlich von jemand anderem geändert. Bitte lade die Seite neu und versuche es erneut.',
            code: 'CONFLICT'
          }, { status: 409 })
        }
      }
    }

    const timePeriods = calculateTimePeriods(data)
    const d = applyModel3Constraints(data)
    const now = nowISO()

    await execute(
      `UPDATE "Order" SET name = ?, vehicleType = ?, orderDate = ?, country = ?, model = ?, range = ?, drive = ?, color = ?, interior = ?, wheels = ?, towHitch = ?, autopilot = ?, deliveryWindow = ?, deliveryLocation = ?, vin = ?, vinReceivedDate = ?, papersReceivedDate = ?, productionDate = ?, typeApproval = ?, typeVariant = ?, deliveryDate = ?, orderToProduction = ?, orderToVin = ?, orderToDelivery = ?, orderToPapers = ?, papersToDelivery = ?, updatedAt = ? WHERE id = ?`,
      [
        d.name as string,
        (d.vehicleType as string) || 'Model Y',
        (d.orderDate as string) || null,
        (d.country as string) || null,
        (d.model as string) || null,
        (d.range as string) || null,
        (d.drive as string) || null,
        (d.color as string) || null,
        (d.interior as string) || null,
        (d.wheels as string) || null,
        (d.towHitch as string) || null,
        (d.autopilot as string) || null,
        (d.deliveryWindow as string) || null,
        (d.deliveryLocation as string) || null,
        (d.vin as string) || null,
        (d.vinReceivedDate as string) || null,
        (d.papersReceivedDate as string) || null,
        (d.productionDate as string) || null,
        (d.typeApproval as string) || null,
        (d.typeVariant as string) || null,
        (d.deliveryDate as string) || null,
        timePeriods.orderToProduction,
        timePeriods.orderToVin,
        timePeriods.orderToDelivery,
        timePeriods.orderToPapers,
        timePeriods.papersToDelivery,
        now,
        id,
      ],
    )

    return NextResponse.json({ id, updatedAt: now, message: 'Order updated successfully' })
  } catch (error) {
    console.error('Failed to update order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    await execute(`DELETE FROM "Order" WHERE id = ?`, [id])
    return NextResponse.json({ message: 'Order deleted successfully' })
  } catch (error) {
    console.error('Failed to delete order:', error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}
