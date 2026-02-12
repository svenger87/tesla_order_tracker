import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withApiAuth } from '@/lib/api-auth'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { ApiOrder, CreateOrderRequest, CreateOrderResponse } from '@/lib/api-types'
import { parse, differenceInDays, isValid } from 'date-fns'

// Helper to parse German date format (DD.MM.YYYY)
function parseGermanDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const parsed = parse(dateStr, 'dd.MM.yyyy', new Date())
  return isValid(parsed) ? parsed : null
}

function calculateDaysBetween(
  fromDate: string | null | undefined,
  toDate: string | null | undefined
): number | null {
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

// Fields to select (excludes editCode for security)
const orderSelectFields = {
  id: true,
  name: true,
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
} as const

// GET /api/v1/orders - List all orders with pagination and filtering
export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)

    // Pagination
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    // Filters
    const country = searchParams.get('country')
    const model = searchParams.get('model')
    const includeArchived = searchParams.get('archived') === 'true'

    const where = {
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
        select: orderSelectFields,
      }),
      prisma.order.count({ where }),
    ])

    // Transform to API response format
    const apiOrders: ApiOrder[] = orders.map((order) => ({
      ...order,
      archivedAt: order.archivedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }))

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
export const POST = withApiAuth(async (request: NextRequest) => {
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

    // Calculate time periods from dates
    const timePeriods = calculateTimePeriods(body)

    // Create order
    const order = await prisma.order.create({
      data: {
        name: body.name.trim(),
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
        ...(editCode && { editCode }),
      },
    })

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
