import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withApiAuth, getApiConsumer } from '@/lib/api-auth'
import { apiOrderSelect, toApiOrder } from '@/lib/api-order'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { CreateOrderRequest, CreateOrderResponse } from '@/lib/api-types'
import { normalizeDateFields, calculateTimePeriods } from '@/lib/date-utils'
import { recordOrderChanges } from '@/lib/order-history'

// GET /api/v1/orders - List all orders with pagination and filtering
export const GET = withApiAuth({ scope: 'orders:read', route: 'GET /v1/orders' }, async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)

    // Pagination
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    // Filters
    const vehicleType = searchParams.get('vehicleType')
    const country = searchParams.get('country')
    const model = searchParams.get('model')
    const includeArchived = searchParams.get('archived') === 'true'

    const where = {
      ...(vehicleType && { vehicleType }),
      ...(country && { country }),
      ...(model && { model }),
      ...(!includeArchived && { archived: false }),
    }

    // Execute queries in parallel
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: apiOrderSelect,
      }),
      prisma.order.count({ where }),
    ])

    // Transform to API response format
    const consumer = getApiConsumer(request)
    const apiOrders = orders.map((order) => toApiOrder(order, consumer))

    return createApiSuccessResponse(apiOrders, {
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + orders.length < total,
      },
    })
  } catch (error) {
    console.error('API v1 orders GET error:', error)
    return ApiErrors.serverError('Failed to fetch orders')
  }
})

// POST /api/v1/orders - Create a new order
export const POST = withApiAuth({ scope: 'orders:write', route: 'POST /v1/orders' }, async (request: NextRequest) => {
  try {
    const body: CreateOrderRequest = await request.json()

    // Validate required fields
    if (!body.name?.trim()) {
      return ApiErrors.validationError('Validation failed', {
        name: 'Name is required',
      })
    }

    // Validate editCode if provided
    let editCode: string | undefined = undefined
    if (body.editCode) {
      if (body.editCode.length < 6) {
        return ApiErrors.validationError('Validation failed', {
          editCode: 'Password must be at least 6 characters',
        })
      }
      if (!/\d/.test(body.editCode)) {
        return ApiErrors.validationError('Validation failed', {
          editCode: 'Password must contain at least one number',
        })
      }

      // Check uniqueness
      const existing = await prisma.order.findUnique({
        where: { editCode: body.editCode },
      })
      if (existing) {
        return ApiErrors.validationError('Validation failed', {
          editCode: 'This password is already in use',
        })
      }

      editCode = body.editCode
    }

    // Normalize date fields
    normalizeDateFields(body)

    // Calculate time periods from dates
    const timePeriods = calculateTimePeriods(body)

    // Create order
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
        ...timePeriods,
        ...(editCode && { editCode }),
      },
    })

    await recordOrderChanges(order.id, null, order)

    const response: CreateOrderResponse = {
      id: order.id,
      editCode: order.editCode,
      message: 'Order created successfully',
    }

    return createApiSuccessResponse(response, { status: 201 })
  } catch (error) {
    console.error('API v1 orders POST error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    if (errorMsg.includes('Unique constraint')) {
      return ApiErrors.conflict('An order with this name and date already exists')
    }
    return ApiErrors.serverError('Failed to create order')
  }
})
