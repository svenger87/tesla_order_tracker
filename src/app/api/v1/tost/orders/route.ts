import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withTostAuth } from '@/lib/tost-auth'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { calculateTimePeriods, orderSelectFields } from '@/lib/tost-helpers'
import { trackApiEvent } from '@/lib/umami'
import { ApiOrder } from '@/lib/api-types'

// Build the data fields from a TOST request body
function buildOrderData(body: Record<string, unknown>) {
  return {
    name: (body.name as string).trim(),
    vehicleType: (body.vehicleType as string) || 'Model Y',
    orderDate: (body.orderDate as string) || null,
    country: (body.country as string) || null,
    model: (body.model as string) || null,
    range: (body.range as string) || null,
    drive: (body.drive as string) || null,
    color: (body.color as string) || null,
    interior: (body.interior as string) || null,
    wheels: (body.wheels as string) || null,
    towHitch: (body.towHitch as string) || null,
    autopilot: (body.autopilot as string) || null,
    seats: (body.seats as string) || null,
    deliveryWindow: (body.deliveryWindow as string) || null,
    deliveryLocation: (body.deliveryLocation as string) || null,
    vin: (body.vin as string) || null,
    vinReceivedDate: (body.vinReceivedDate as string) || null,
    papersReceivedDate: (body.papersReceivedDate as string) || null,
    productionDate: (body.productionDate as string) || null,
    typeApproval: (body.typeApproval as string) || null,
    typeVariant: (body.typeVariant as string) || null,
    deliveryDate: (body.deliveryDate as string) || null,
    tostUserId: (body.tostUserId as string) || null,
  }
}

// POST /api/v1/tost/orders - Create a new TOST-managed order
export const POST = withTostAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()

    if (!body.name?.trim()) {
      return ApiErrors.validationError('Validation failed', {
        name: 'Name is required',
      })
    }

    const timePeriods = calculateTimePeriods(body)
    const orderData = buildOrderData(body)

    const order = await prisma.order.create({
      data: {
        ...(body.id && { id: body.id }),
        ...orderData,
        source: 'tost',
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
      return ApiErrors.conflict('An order with this ID already exists')
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
    if (name) {
      where.name = {
        equals: decodeURIComponent(name).trim(),
        mode: 'insensitive',
      }
    }
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
