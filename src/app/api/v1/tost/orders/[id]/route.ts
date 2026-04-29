import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withTostAuth } from '@/lib/tost-auth'
import { RouteContext } from '@/lib/api-auth'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { calculateTimePeriods } from '@/lib/tost-helpers'
import { normalizeDateFields } from '@/lib/date-utils'
import { trackApiEvent } from '@/lib/umami'
import { recordOrderChanges } from '@/lib/order-history'

// DELETE /api/v1/tost/orders/[id] - Delete a TOST-owned order
export const DELETE = withTostAuth(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    try {
      const { id } = await context.params

      const order = await prisma.order.findUnique({
        where: { id },
        select: { id: true, source: true, name: true },
      })

      if (!order) {
        return ApiErrors.notFound('Order')
      }

      if (order.source !== 'tost') {
        return ApiErrors.forbidden('Only TOST-managed orders can be deleted via this endpoint.')
      }

      await prisma.order.delete({ where: { id } })

      trackApiEvent({ name: 'tost-delete-order', url: `/api/v1/tost/orders/${id}` })

      return createApiSuccessResponse({
        id: order.id,
        message: 'Order deleted successfully',
      })
    } catch (error) {
      console.error('TOST orders DELETE error:', error)
      return ApiErrors.serverError('Failed to delete order')
    }
  }
)

// PUT /api/v1/tost/orders/[id] - Update a TOST-owned order
export const PUT = withTostAuth(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    try {
      const { id } = await context.params
      const body = await request.json()

      // Find the order and check ownership
      const order = await prisma.order.findUnique({
        where: { id },
        select: { id: true, source: true, updatedAt: true },
      })

      if (!order) {
        return ApiErrors.notFound('Order')
      }

      if (order.source !== 'tost') {
        return ApiErrors.forbidden('Order is not managed by TOST. Claim it first.')
      }

      // Optimistic locking skipped — TOST is the source of truth for its own orders

      // Normalize date fields
      normalizeDateFields(body)

      // Build update data from provided fields
      const updateData: Record<string, unknown> = {}
      // papersReceivedDate, typeApproval, typeVariant excluded —
      // TOST can't provide these, users edit them via the webapp
      const allowedFields = [
        'name', 'vehicleType', 'orderDate', 'country', 'model', 'range',
        'drive', 'color', 'interior', 'wheels', 'towHitch', 'autopilot',
        'seats', 'deliveryWindow', 'deliveryLocation', 'vin',
        'vinReceivedDate', 'productionDate',
        'deliveryDate', 'tostUserId',
      ]

      for (const field of allowedFields) {
        if (field in body) {
          updateData[field] = body[field] || null
        }
      }

      // Recalculate time periods
      const dateFields = {
        orderDate: (updateData.orderDate as string) ?? undefined,
        productionDate: (updateData.productionDate as string) ?? undefined,
        vinReceivedDate: (updateData.vinReceivedDate as string) ?? undefined,
        deliveryDate: (updateData.deliveryDate as string) ?? undefined,
        papersReceivedDate: (updateData.papersReceivedDate as string) ?? undefined,
      }
      const timePeriods = calculateTimePeriods(dateFields)
      for (const [key, value] of Object.entries(timePeriods)) {
        if (value !== null) {
          updateData[key] = value
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        const before = await tx.order.findUnique({ where: { id } })
        const u = await tx.order.update({
          where: { id },
          data: updateData,
        })
        await recordOrderChanges(u.id, before, u, { source: 'tost', tx })
        return u
      })

      trackApiEvent({ name: 'tost-update-order', url: `/api/v1/tost/orders/${id}`, data: { fieldsUpdated: Object.keys(updateData).length } })

      return createApiSuccessResponse({
        id: updated.id,
        updatedAt: updated.updatedAt.toISOString(),
        message: 'Order updated successfully',
      })
    } catch (error) {
      console.error('TOST orders PUT error:', error)
      return ApiErrors.serverError('Failed to update order')
    }
  }
)
