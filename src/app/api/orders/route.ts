import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { parse, differenceInDays, isValid } from 'date-fns'

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
    console.error('TURSO_DATABASE_URL set:', !!process.env.TURSO_DATABASE_URL)
    console.error('TURSO_AUTH_TOKEN set:', !!process.env.TURSO_AUTH_TOKEN)
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

    // Handle custom password if provided
    let editCode: string | undefined = undefined
    if (body.customPassword) {
      // Validate custom password
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
      const existing = await prisma.order.findUnique({
        where: { editCode: body.customPassword },
      })
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

    const order = await prisma.order.create({
      data: {
        name: body.name,
        vehicleType: body.vehicleType || 'Model Y',
        orderDate: body.orderDate || null,
        country: body.country || null,
        model: body.model || null,
        range: body.range || null,
        drive: body.drive || null,
        color: body.color || null,
        interior: body.interior || null,
        wheels: body.wheels || null,
        towHitch: body.towHitch || null,
        autopilot: body.autopilot || null,
        deliveryWindow: body.deliveryWindow || null,
        deliveryLocation: body.deliveryLocation || null,
        vin: body.vin || null,
        vinReceivedDate: body.vinReceivedDate || null,
        papersReceivedDate: body.papersReceivedDate || null,
        productionDate: body.productionDate || null,
        typeApproval: body.typeApproval || null,
        typeVariant: body.typeVariant || null,
        deliveryDate: body.deliveryDate || null,
        ...timePeriods,
        // Use custom password as editCode if provided, otherwise Prisma generates cuid
        ...(editCode && { editCode }),
      },
    })

    return NextResponse.json({
      id: order.id,
      editCode: order.editCode,
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

        // Check uniqueness
        const existing = await prisma.order.findUnique({ where: { editCode: newEditCode } })
        if (existing) {
          return NextResponse.json({ error: 'Dieses Passwort ist bereits vergeben' }, { status: 400 })
        }

        // Calculate time periods from dates
        const timePeriods = calculateTimePeriods(data)

        // Update order with new editCode
        const updated = await prisma.order.update({
          where: { id },
          data: {
            editCode: newEditCode, // Set the new password
            name: data.name,
            vehicleType: data.vehicleType || 'Model Y',
            orderDate: data.orderDate || null,
            country: data.country || null,
            model: data.model || null,
            range: data.range || null,
            drive: data.drive || null,
            color: data.color || null,
            interior: data.interior || null,
            wheels: data.wheels || null,
            towHitch: data.towHitch || null,
            autopilot: data.autopilot || null,
            deliveryWindow: data.deliveryWindow || null,
            deliveryLocation: data.deliveryLocation || null,
            vin: data.vin || null,
            vinReceivedDate: data.vinReceivedDate || null,
            papersReceivedDate: data.papersReceivedDate || null,
            productionDate: data.productionDate || null,
            typeApproval: data.typeApproval || null,
            typeVariant: data.typeVariant || null,
            deliveryDate: data.deliveryDate || null,
            ...timePeriods,
          },
        })

        return NextResponse.json({
          id: updated.id,
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

    const updated = await prisma.order.update({
      where: { id },
      data: {
        name: data.name,
        vehicleType: data.vehicleType || 'Model Y',
        orderDate: data.orderDate || null,
        country: data.country || null,
        model: data.model || null,
        range: data.range || null,
        drive: data.drive || null,
        color: data.color || null,
        interior: data.interior || null,
        wheels: data.wheels || null,
        towHitch: data.towHitch || null,
        autopilot: data.autopilot || null,
        deliveryWindow: data.deliveryWindow || null,
        deliveryLocation: data.deliveryLocation || null,
        vin: data.vin || null,
        vinReceivedDate: data.vinReceivedDate || null,
        papersReceivedDate: data.papersReceivedDate || null,
        productionDate: data.productionDate || null,
        typeApproval: data.typeApproval || null,
        typeVariant: data.typeVariant || null,
        deliveryDate: data.deliveryDate || null,
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
