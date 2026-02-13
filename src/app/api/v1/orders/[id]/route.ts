import { queryOne, execute, nowISO } from '@/lib/db'
import { ORDER_PUBLIC_COLS, transformOrderRow } from '@/lib/db-helpers'
import { NextRequest } from 'next/server'
import { withApiAuth, RouteContext } from '@/lib/api-auth'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { ApiOrder, UpdateOrderRequest, UpdateOrderResponse } from '@/lib/api-types'
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

// GET /api/v1/orders/[id] - Get a single order by ID
export const GET = withApiAuth(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    try {
      const { id } = await context.params

      const row = await queryOne<Record<string, unknown>>(
        `SELECT ${ORDER_PUBLIC_COLS} FROM "Order" WHERE id = ?`,
        [id],
      )

      if (!row) {
        return ApiErrors.notFound('Order')
      }

      const order = transformOrderRow(row)

      // SQLite returns dates as strings already — no .toISOString() needed
      const apiOrder: ApiOrder = {
        ...order,
        archivedAt: order.archivedAt ?? null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }

      return createApiSuccessResponse(apiOrder)
    } catch (error) {
      console.error('API v1 orders GET by ID error:', error)
      return ApiErrors.serverError('Failed to fetch order')
    }
  }
)

// PUT /api/v1/orders/[id] - Update an order (requires editCode)
export const PUT = withApiAuth(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    try {
      const { id } = await context.params
      const body: UpdateOrderRequest = await request.json()

      // Validate editCode is provided
      if (!body.editCode) {
        return ApiErrors.validationError('Validation failed', {
          editCode: 'Edit code is required for updates',
        })
      }

      // Find the order and verify editCode
      const order = await queryOne<{ id: string; editCode: string | null; updatedAt: string }>(
        `SELECT id, editCode, updatedAt FROM "Order" WHERE id = ?`,
        [id],
      )

      if (!order) {
        return ApiErrors.notFound('Order')
      }

      // Verify editCode matches
      if (order.editCode !== body.editCode) {
        return ApiErrors.unauthorized('Invalid edit code')
      }

      // Optimistic locking: check if order was modified since user loaded it
      if (body.expectedUpdatedAt) {
        const expectedTime = new Date(body.expectedUpdatedAt).getTime()
        const actualTime = new Date(order.updatedAt).getTime()
        if (actualTime > expectedTime) {
          return ApiErrors.conflict(
            'Order was modified by another user. Please refresh and try again.'
          )
        }
      }

      // Build update data from provided fields
      const setClauses: string[] = ['updatedAt = ?']
      const now = nowISO()
      const args: unknown[] = [now]

      const fieldMappings: Array<[keyof UpdateOrderRequest, string]> = [
        ['name', 'name'],
        ['orderDate', 'orderDate'],
        ['country', 'country'],
        ['model', 'model'],
        ['range', 'range'],
        ['drive', 'drive'],
        ['color', 'color'],
        ['interior', 'interior'],
        ['wheels', 'wheels'],
        ['towHitch', 'towHitch'],
        ['autopilot', 'autopilot'],
        ['deliveryWindow', 'deliveryWindow'],
        ['deliveryLocation', 'deliveryLocation'],
        ['vin', 'vin'],
        ['vinReceivedDate', 'vinReceivedDate'],
        ['papersReceivedDate', 'papersReceivedDate'],
        ['productionDate', 'productionDate'],
        ['typeApproval', 'typeApproval'],
        ['typeVariant', 'typeVariant'],
        ['deliveryDate', 'deliveryDate'],
      ]

      for (const [key, dbKey] of fieldMappings) {
        if (key in body && key !== 'editCode' && key !== 'expectedUpdatedAt') {
          setClauses.push(`${dbKey} = ?`)
          args.push(body[key] || null)
        }
      }

      // Recalculate time periods if any date fields changed
      const timePeriods = calculateTimePeriods({
        orderDate: ('orderDate' in body ? body.orderDate : undefined) ?? undefined,
        productionDate: ('productionDate' in body ? body.productionDate : undefined) ?? undefined,
        vinReceivedDate: ('vinReceivedDate' in body ? body.vinReceivedDate : undefined) ?? undefined,
        deliveryDate: ('deliveryDate' in body ? body.deliveryDate : undefined) ?? undefined,
        papersReceivedDate: ('papersReceivedDate' in body ? body.papersReceivedDate : undefined) ?? undefined,
      })

      // Only include time periods that are not null
      for (const [key, value] of Object.entries(timePeriods)) {
        if (value !== null) {
          setClauses.push(`${key} = ?`)
          args.push(value)
        }
      }

      args.push(id)
      await execute(
        `UPDATE "Order" SET ${setClauses.join(', ')} WHERE id = ?`,
        args,
      )

      const response: UpdateOrderResponse = {
        id,
        updatedAt: now,
        message: 'Order updated successfully',
      }

      return createApiSuccessResponse(response)
    } catch (error) {
      console.error('API v1 orders PUT error:', error)
      return ApiErrors.serverError('Failed to update order')
    }
  }
)
