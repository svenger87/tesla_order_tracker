import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withTostAuth } from '@/lib/tost-auth'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { calculateTimePeriods, orderSelectFields } from '@/lib/tost-helpers'
import { trackApiEvent } from '@/lib/umami'
import { ApiOrder } from '@/lib/api-types'

// POST /api/v1/tost/orders - Create a new TOST-managed order
export const POST = withTostAuth(async (request: NextRequest) => {
  let customId: string | undefined
  try {
    const body = await request.json()
    customId = body.id

    if (!body.name?.trim()) {
      return ApiErrors.validationError('Validation failed', {
        name: 'Name is required',
      })
    }

    const timePeriods = calculateTimePeriods(body)

    const order = await prisma.order.create({
      data: {
        // Use TOST-provided ID if given, otherwise auto-generate
        ...(body.id && { id: body.id }),
        name: body.name.trim(),
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
        seats: body.seats || null,
        deliveryWindow: body.deliveryWindow || null,
        deliveryLocation: body.deliveryLocation || null,
        vin: body.vin || null,
        vinReceivedDate: body.vinReceivedDate || null,
        papersReceivedDate: body.papersReceivedDate || null,
        productionDate: body.productionDate || null,
        typeApproval: body.typeApproval || null,
        typeVariant: body.typeVariant || null,
        deliveryDate: body.deliveryDate || null,
        source: 'tost',
        tostUserId: body.tostUserId || null,
        ...timePeriods,
      },
    })

    trackApiEvent({ name: 'tost-create-order', url: '/api/v1/tost/orders', data: { orderId: order.id, vehicleType: body.vehicleType || 'Model Y', customId: !!body.id } })

    return createApiSuccessResponse(
      { id: order.id, message: 'Order created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('TOST orders POST error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    if (errorMsg.includes('Unique constraint')) {
      if (customId) {
        return ApiErrors.conflict('An order with this ID already exists')
      }
      return ApiErrors.conflict('An order with this name and date already exists')
    }
    return ApiErrors.serverError('Failed to create order')
  }
})

// GET /api/v1/tost/orders - Find orders by id, name, or tostUserId
// At least one filter is required: ?id=xxx or ?name=xxx or ?tostUserId=xxx
export const GET = withTostAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const name = searchParams.get('name')
    const tostUserId = searchParams.get('tostUserId')

    if (!id && !name && !tostUserId) {
      return ApiErrors.validationError('Validation failed', {
        filter: 'At least one filter is required: id, name, or tostUserId',
      })
    }

    // If searching by ID, return single order directly
    if (id) {
      const order = await prisma.order.findUnique({
        where: { id },
        select: orderSelectFields,
      })

      if (!order) {
        return createApiSuccessResponse([], { count: 0 })
      }

      const apiOrder: ApiOrder = {
        ...order,
        archivedAt: order.archivedAt?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      }

      return createApiSuccessResponse([apiOrder], { count: 1 })
    }

    // Build where clause from provided filters
    const where: Record<string, unknown> = { archived: false }
    if (name) where.name = decodeURIComponent(name)
    if (tostUserId) where.tostUserId = decodeURIComponent(tostUserId)

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: orderSelectFields,
    })

    const apiOrders: ApiOrder[] = orders.map((order) => ({
      ...order,
      archivedAt: order.archivedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }))

    trackApiEvent({ name: 'tost-find-orders', url: '/api/v1/tost/orders', data: { filterBy: id ? 'id' : name ? 'name' : 'tostUserId', resultCount: apiOrders.length } })

    return createApiSuccessResponse(apiOrders, { count: apiOrders.length })
  } catch (error) {
    console.error('TOST orders GET error:', error)
    return ApiErrors.serverError('Failed to fetch orders')
  }
})
