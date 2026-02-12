import { prisma } from '@/lib/db'
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

// GET /api/v1/orders/[id] - Get a single order by ID
export const GET = withApiAuth(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    try {
      const { id } = await context.params

      const order = await prisma.order.findUnique({
        where: { id },
        select: orderSelectFields,
      })

      if (!order) {
        return ApiErrors.notFound('Order')
      }

      const apiOrder: ApiOrder = {
        ...order,
        archivedAt: order.archivedAt?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
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
      const order = await prisma.order.findUnique({
        where: { id },
        select: { id: true, editCode: true, updatedAt: true },
      })

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
        const actualTime = order.updatedAt.getTime()
        if (actualTime > expectedTime) {
          return ApiErrors.conflict(
            'Order was modified by another user. Please refresh and try again.'
          )
        }
      }

      // Build update data from provided fields
      const updateData: Record<string, unknown> = {}

      // Only include fields that were explicitly provided
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
          updateData[dbKey] = body[key] || null
        }
      }

      // Recalculate time periods if any date fields changed
      const timePeriods = calculateTimePeriods({
        orderDate: (updateData.orderDate as string) ?? undefined,
        productionDate: (updateData.productionDate as string) ?? undefined,
        vinReceivedDate: (updateData.vinReceivedDate as string) ?? undefined,
        deliveryDate: (updateData.deliveryDate as string) ?? undefined,
        papersReceivedDate: (updateData.papersReceivedDate as string) ?? undefined,
      })

      // Only include time periods that are not null
      for (const [key, value] of Object.entries(timePeriods)) {
        if (value !== null) {
          updateData[key] = value
        }
      }

      // Update the order
      const updated = await prisma.order.update({
        where: { id },
        data: updateData,
        select: { id: true, updatedAt: true },
      })

      const response: UpdateOrderResponse = {
        id: updated.id,
        updatedAt: updated.updatedAt.toISOString(),
        message: 'Order updated successfully',
      }

      return createApiSuccessResponse(response)
    } catch (error) {
      console.error('API v1 orders PUT error:', error)
      return ApiErrors.serverError('Failed to update order')
    }
  }
)
