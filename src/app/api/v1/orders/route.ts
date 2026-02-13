import { query, queryOne, execute, generateId, nowISO } from '@/lib/db'
import { ORDER_PUBLIC_COLS, transformOrderRow } from '@/lib/db-helpers'
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

// GET /api/v1/orders - List all orders with pagination and filtering
export const GET = withApiAuth(async (request: NextRequest) => {
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

    let whereSql = `WHERE 1=1`
    const args: unknown[] = []

    if (vehicleType) { whereSql += ` AND vehicleType = ?`; args.push(vehicleType) }
    if (country) { whereSql += ` AND country = ?`; args.push(country) }
    if (model) { whereSql += ` AND model = ?`; args.push(model) }
    if (!includeArchived) { whereSql += ` AND archived = 0` }

    // Execute queries in parallel
    const [rows, countRow] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT ${ORDER_PUBLIC_COLS} FROM "Order" ${whereSql} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
        [...args, limit, offset],
      ),
      queryOne<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM "Order" ${whereSql}`,
        args,
      ),
    ])

    const total = countRow?.cnt ?? 0
    const orders = rows.map(transformOrderRow)

    // SQLite returns dates as strings already — no .toISOString() needed
    const apiOrders: ApiOrder[] = orders.map((order) => ({
      ...order,
      archivedAt: order.archivedAt ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
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
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM "Order" WHERE editCode = ? LIMIT 1`,
        [body.editCode],
      )
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
    const id = generateId()
    const now = nowISO()
    await execute(
      `INSERT INTO "Order" (id, name, vehicleType, orderDate, country, model, range, drive, color, interior, wheels, towHitch, autopilot, deliveryWindow, deliveryLocation, vin, vinReceivedDate, papersReceivedDate, productionDate, typeApproval, typeVariant, deliveryDate, orderToProduction, orderToVin, orderToDelivery, orderToPapers, papersToDelivery, editCode, archived, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        id,
        body.name.trim(),
        body.vehicleType || 'Model Y',
        body.orderDate || null,
        body.country || null,
        body.model || null,
        body.range || null,
        body.drive || null,
        body.color || null,
        body.interior || null,
        body.wheels || null,
        body.towHitch || null,
        body.autopilot || null,
        body.deliveryWindow || null,
        body.deliveryLocation || null,
        body.vin || null,
        body.vinReceivedDate || null,
        body.papersReceivedDate || null,
        body.productionDate || null,
        body.typeApproval || null,
        body.typeVariant || null,
        body.deliveryDate || null,
        timePeriods.orderToProduction,
        timePeriods.orderToVin,
        timePeriods.orderToDelivery,
        timePeriods.orderToPapers,
        timePeriods.papersToDelivery,
        editCode || null,
        now,
        now,
      ],
    )

    const response: CreateOrderResponse = {
      id,
      editCode: editCode || null,
      message: 'Order created successfully',
    }

    return createApiSuccessResponse(response, { status: 201 })
  } catch (error) {
    console.error('API v1 orders POST error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    if (errorMsg.includes('UNIQUE constraint')) {
      return ApiErrors.conflict('An order with this name and date already exists')
    }
    return ApiErrors.serverError('Failed to create order')
  }
})
