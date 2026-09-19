import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withApiAuth, getApiConsumer, RouteContext } from '@/lib/api-auth'
import { apiOrderSelect, toApiOrder } from '@/lib/api-order'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { UpdateOrderRequest, UpdateOrderResponse } from '@/lib/api-types'
import { normalizeDateFields, calculateTimePeriods } from '@/lib/date-utils'
import { recordOrderChanges } from '@/lib/order-history'

// GET /api/v1/orders/[id] - Get a single order by ID
export const GET = withApiAuth({ scope: 'orders:read', route: 'GET /v1/orders/[id]' },
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    try {
      const { id } = await context.params

      const order = await prisma.order.findUnique({
        where: { id },
        select: apiOrderSelect,
      })

      if (!order) {
        return ApiErrors.notFound('Order')
      }

      const apiOrder = toApiOrder(order, getApiConsumer(request))

      return createApiSuccessResponse(apiOrder)
    } catch (error) {
      console.error('API v1 orders GET by ID error:', error)
      return ApiErrors.serverError('Failed to fetch order')
    }
  }
)

// PUT /api/v1/orders/[id] - Update an order (requires editCode)
export const PUT = withApiAuth({ scope: 'orders:write', route: 'PUT /v1/orders/[id]' },
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

      // Normalize date fields
      normalizeDateFields(body)

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
        ['seats', 'seats'],
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
      const updated = await prisma.$transaction(async (tx) => {
        const before = await tx.order.findUnique({ where: { id } })
        const u = await tx.order.update({
          where: { id },
          data: updateData,
        })
        await recordOrderChanges(id, before, u, { tx })
        return u
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
