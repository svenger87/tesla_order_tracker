import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withApiAuth, getApiConsumer, RouteContext } from '@/lib/api-auth'
import { apiOrderSelect, toApiOrder } from '@/lib/api-order'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { UpdateOrderRequest, UpdateOrderResponse } from '@/lib/api-types'
import { normalizeDateFields } from '@/lib/date-utils'
import { recordOrderChanges } from '@/lib/order-history'
import { editCodeMatches } from '@/lib/edit-code'
import { normalizeCountryIn, timePeriodsAfterUpdate } from '@/lib/order-update'
import { dateSequenceProblem, refundCodeAttempt, reserveCodeAttempt, writeBrake } from '@/lib/api-order-write'

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
      const throttled = writeBrake(request, getApiConsumer(request))
      if (throttled) return throttled

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

      // Reserved before the compare, so a parallel burst cannot outrun the
      // count, and a spent budget answers the same whether the guess was right.
      const consumer = getApiConsumer(request)
      const reservedAt = Date.now()
      const exhausted = reserveCodeAttempt(request, consumer, id, reservedAt)
      if (exhausted) return exhausted

      // Bcrypt-aware, so codes stored in plain text before hashing still work
      if (!(await editCodeMatches(body.editCode, order.editCode))) {
        return ApiErrors.unauthorized('Invalid edit code')
      }
      refundCodeAttempt(request, consumer, id, reservedAt)

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

      // Check the merged chronology, as the web form does
      const stored = await prisma.order.findUnique({
        where: { id },
        select: { orderDate: true, productionDate: true, papersReceivedDate: true, deliveryDate: true },
      })
      const sequenceProblem = dateSequenceProblem({ ...stored, ...updateData })
      if (sequenceProblem) return sequenceProblem

      const data = normalizeCountryIn(updateData)

      // Update the order, with waiting times worked out from the merged dates
      const updated = await prisma.$transaction(async (tx) => {
        const before = await tx.order.findUnique({ where: { id } })
        const u = await tx.order.update({
          where: { id },
          data: { ...data, ...timePeriodsAfterUpdate(before, data) },
        })
        await recordOrderChanges(id, before, u, { tx, source: consumer?.source ?? null })
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
