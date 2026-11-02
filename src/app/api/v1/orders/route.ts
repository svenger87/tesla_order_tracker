import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withApiAuth, getApiConsumer } from '@/lib/api-auth'
import { apiOrderSelect, toApiOrder } from '@/lib/api-order'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { CreateOrderRequest, CreateOrderResponse } from '@/lib/api-types'
import { normalizeDateFields, calculateTimePeriods } from '@/lib/date-utils'
import { recordOrderChanges } from '@/lib/order-history'
import { editCodeError, hashEditCode } from '@/lib/edit-code'
import { createBrake, dateSequenceProblem } from '@/lib/api-order-write'

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
    const consumer = getApiConsumer(request)
    const throttled = createBrake(request, consumer)
    if (throttled) return throttled

    const body: CreateOrderRequest = await request.json()

    // Validate required fields
    if (!body.name?.trim()) {
      return ApiErrors.validationError('Validation failed', {
        name: 'Name is required',
      })
    }

    // Stored as a bcrypt hash, like the web form's. Never checked against the
    // other orders' codes: answering "already in use" would let any key holder
    // test guesses of someone else's password.
    let editCode: string | undefined = undefined
    if (body.editCode) {
      const problem = editCodeError(body.editCode)
      if (problem) {
        return ApiErrors.validationError('Validation failed', { editCode: problem })
      }
      editCode = await hashEditCode(body.editCode)
    }

    // Normalize date fields
    normalizeDateFields(body)
    const sequenceProblem = dateSequenceProblem(body as unknown as Record<string, unknown>)
    if (sequenceProblem) return sequenceProblem

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
        // The key's badge, so its orders show where they came from.
        ...(consumer?.source && { source: consumer.source }),
      },
    })

    await recordOrderChanges(order.id, null, order, { source: consumer?.source ?? null })

    const response: CreateOrderResponse = {
      id: order.id,
      // The code as the caller sent it; only its hash is stored.
      editCode: body.editCode || null,
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
