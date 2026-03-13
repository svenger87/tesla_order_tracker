import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withTostAuth } from '@/lib/tost-auth'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { calculateTimePeriods, orderSelectFields } from '@/lib/tost-helpers'
import { ApiOrder } from '@/lib/api-types'

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

    const order = await prisma.order.create({
      data: {
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

    return createApiSuccessResponse(
      { id: order.id, message: 'Order created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('TOST orders POST error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    if (errorMsg.includes('Unique constraint')) {
      return ApiErrors.conflict('An order with this name and date already exists')
    }
    return ApiErrors.serverError('Failed to create order')
  }
})

// GET /api/v1/tost/orders?name=xxx - Find orders by name
export const GET = withTostAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')

    if (!name) {
      return ApiErrors.validationError('Validation failed', {
        name: 'name query parameter is required',
      })
    }

    const orders = await prisma.order.findMany({
      where: {
        name: decodeURIComponent(name),
        archived: false,
      },
      orderBy: { createdAt: 'desc' },
      select: orderSelectFields,
    })

    const apiOrders: ApiOrder[] = orders.map((order) => ({
      ...order,
      archivedAt: order.archivedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }))

    return createApiSuccessResponse(apiOrders, { count: apiOrders.length })
  } catch (error) {
    console.error('TOST orders GET error:', error)
    return ApiErrors.serverError('Failed to fetch orders')
  }
})
