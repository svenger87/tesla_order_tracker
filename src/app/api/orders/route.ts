import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { parse, differenceInDays, isValid } from 'date-fns'
import bcrypt from 'bcryptjs'
import {
  MODEL_3_TOW_HITCH_AVAILABLE,
} from '@/lib/types'

// Bcrypt-aware password comparison
async function comparePassword(input: string, stored: string): Promise<boolean> {
  if (stored.startsWith('$2')) {
    return bcrypt.compare(input, stored)
  }
  return input === stored
}

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

    // Try to query with archive filter, fall back to without if field doesn't exist
    let orders
    try {
      orders = await prisma.order.findMany({
        where: showArchived ? {} : { archived: false },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          vehicleType: true,
          orderDate: true,
          country: true,
          model: true,
          range: true,
          drive: true,
          color: true,
          interior: true,
          wheels: true,
          towHitch: true,
          autopilot: true,
          deliveryWindow: true,
          deliveryLocation: true,
          vin: true,
          vinReceivedDate: true,
          papersReceivedDate: true,
          productionDate: true,
          typeApproval: true,
          typeVariant: true,
          deliveryDate: true,
          orderToProduction: true,
          orderToVin: true,
          orderToDelivery: true,
          orderToPapers: true,
          papersToDelivery: true,
          archived: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    } catch {
      // If archived field doesn't exist yet (migration not run), fetch without it
      orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          vehicleType: true,
          orderDate: true,
          country: true,
          model: true,
          range: true,
          drive: true,
          color: true,
          interior: true,
          wheels: true,
          towHitch: true,
          autopilot: true,
          deliveryWindow: true,
          deliveryLocation: true,
          vin: true,
          vinReceivedDate: true,
          papersReceivedDate: true,
          productionDate: true,
          typeApproval: true,
          typeVariant: true,
          deliveryDate: true,
          orderToProduction: true,
          orderToVin: true,
          orderToDelivery: true,
          orderToPapers: true,
          papersToDelivery: true,
          createdAt: true,
        },
      })
      // Add default archived fields to the response
      orders = orders.map(o => ({ ...o, archived: false, archivedAt: null, updatedAt: o.createdAt }))
    }
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    // Return empty array to prevent frontend crash
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

    // Validate password (required for all new orders)
    if (!body.customPassword) {
      return NextResponse.json(
        { error: 'Passwort ist erforderlich' },
        { status: 400 }
      )
    }
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

    // Hash the password with bcrypt
    const editCode = await bcrypt.hash(body.customPassword, 10)

    // Calculate time periods from dates
    const timePeriods = calculateTimePeriods(body)

    // Apply Model 3 constraints (set unavailable options to "-")
    const constrainedData = applyModel3Constraints(body)

    const order = await prisma.order.create({
      data: {
        name: constrainedData.name as string,
        vehicleType: (constrainedData.vehicleType as string) || 'Model Y',
        orderDate: (constrainedData.orderDate as string) || null,
        country: (constrainedData.country as string) || null,
        model: (constrainedData.model as string) || null,
        range: (constrainedData.range as string) || null,
        drive: (constrainedData.drive as string) || null,
        color: (constrainedData.color as string) || null,
        interior: (constrainedData.interior as string) || null,
        wheels: (constrainedData.wheels as string) || null,
        towHitch: (constrainedData.towHitch as string) || null,
        autopilot: (constrainedData.autopilot as string) || null,
        deliveryWindow: (constrainedData.deliveryWindow as string) || null,
        deliveryLocation: (constrainedData.deliveryLocation as string) || null,
        vin: (constrainedData.vin as string) || null,
        vinReceivedDate: (constrainedData.vinReceivedDate as string) || null,
        papersReceivedDate: (constrainedData.papersReceivedDate as string) || null,
        productionDate: (constrainedData.productionDate as string) || null,
        typeApproval: (constrainedData.typeApproval as string) || null,
        typeVariant: (constrainedData.typeVariant as string) || null,
        deliveryDate: (constrainedData.deliveryDate as string) || null,
        ...timePeriods,
        editCode,
      },
    })

    return NextResponse.json({
      id: order.id,
      isCustomPassword: true,
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
      const order = await prisma.order.findUnique({ where: { id } })

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      // Legacy order flow - user verified via username
      if (isLegacy && order.editCode === null) {
        // For legacy orders, user must set a new password
        if (!newEditCode) {
          return NextResponse.json({ error: 'Neues Passwort erforderlich für Bestandseinträge' }, { status: 400 })
        }

        // Validate new password
        if (newEditCode.length < 6) {
          return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' }, { status: 400 })
        }
        if (!/\d/.test(newEditCode)) {
          return NextResponse.json({ error: 'Passwort muss mindestens eine Zahl enthalten' }, { status: 400 })
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newEditCode, 10)

        // Calculate time periods from dates
        const timePeriods = calculateTimePeriods(data)

        // Apply Model 3 constraints
        const constrainedData = applyModel3Constraints(data)

        // Update order with new hashed password
        const updated = await prisma.order.update({
          where: { id },
          data: {
            editCode: hashedPassword, // Set the new hashed password
            name: constrainedData.name as string,
            vehicleType: (constrainedData.vehicleType as string) || 'Model Y',
            orderDate: (constrainedData.orderDate as string) || null,
            country: (constrainedData.country as string) || null,
            model: (constrainedData.model as string) || null,
            range: (constrainedData.range as string) || null,
            drive: (constrainedData.drive as string) || null,
            color: (constrainedData.color as string) || null,
            interior: (constrainedData.interior as string) || null,
            wheels: (constrainedData.wheels as string) || null,
            towHitch: (constrainedData.towHitch as string) || null,
            autopilot: (constrainedData.autopilot as string) || null,
            deliveryWindow: (constrainedData.deliveryWindow as string) || null,
            deliveryLocation: (constrainedData.deliveryLocation as string) || null,
            vin: (constrainedData.vin as string) || null,
            vinReceivedDate: (constrainedData.vinReceivedDate as string) || null,
            papersReceivedDate: (constrainedData.papersReceivedDate as string) || null,
            productionDate: (constrainedData.productionDate as string) || null,
            typeApproval: (constrainedData.typeApproval as string) || null,
            typeVariant: (constrainedData.typeVariant as string) || null,
            deliveryDate: (constrainedData.deliveryDate as string) || null,
            ...timePeriods,
          },
        })

        return NextResponse.json({
          id: updated.id,
          message: 'Eintrag aktualisiert und neues Passwort gesetzt!',
        })
      }

      // Standard edit code verification
      if (!editCode) {
        return NextResponse.json({ error: 'Edit code required' }, { status: 401 })
      }

      if (!order.editCode || !(await comparePassword(editCode, order.editCode))) {
        return NextResponse.json({ error: 'Invalid edit code' }, { status: 401 })
      }
    }

    // Optimistic locking: check if order was modified since user loaded it
    if (expectedUpdatedAt) {
      const currentOrder = await prisma.order.findUnique({ where: { id } })
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

    // Calculate time periods from dates
    const timePeriods = calculateTimePeriods(data)

    // Apply Model 3 constraints
    const constrainedData = applyModel3Constraints(data)

    const updated = await prisma.order.update({
      where: { id },
      data: {
        name: constrainedData.name as string,
        vehicleType: (constrainedData.vehicleType as string) || 'Model Y',
        orderDate: (constrainedData.orderDate as string) || null,
        country: (constrainedData.country as string) || null,
        model: (constrainedData.model as string) || null,
        range: (constrainedData.range as string) || null,
        drive: (constrainedData.drive as string) || null,
        color: (constrainedData.color as string) || null,
        interior: (constrainedData.interior as string) || null,
        wheels: (constrainedData.wheels as string) || null,
        towHitch: (constrainedData.towHitch as string) || null,
        autopilot: (constrainedData.autopilot as string) || null,
        deliveryWindow: (constrainedData.deliveryWindow as string) || null,
        deliveryLocation: (constrainedData.deliveryLocation as string) || null,
        vin: (constrainedData.vin as string) || null,
        vinReceivedDate: (constrainedData.vinReceivedDate as string) || null,
        papersReceivedDate: (constrainedData.papersReceivedDate as string) || null,
        productionDate: (constrainedData.productionDate as string) || null,
        typeApproval: (constrainedData.typeApproval as string) || null,
        typeVariant: (constrainedData.typeVariant as string) || null,
        deliveryDate: (constrainedData.deliveryDate as string) || null,
        ...timePeriods,
      },
    })

    return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt, message: 'Order updated successfully' })
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

    await prisma.order.delete({ where: { id } })
    return NextResponse.json({ message: 'Order deleted successfully' })
  } catch (error) {
    console.error('Failed to delete order:', error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}
