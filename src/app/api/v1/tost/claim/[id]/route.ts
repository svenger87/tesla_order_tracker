import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withTostAuth } from '@/lib/tost-auth'
import { RouteContext } from '@/lib/api-auth'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { trackApiEvent } from '@/lib/umami'

// POST /api/v1/tost/claim/[id] - Claim an existing order for TOST
// Optionally accepts `newId` to replace the order's ID with a TOST-generated one
export const POST = withTostAuth(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    try {
      const { id } = await context.params
      const body = await request.json().catch(() => ({}))

      const order = await prisma.order.findUnique({
        where: { id },
      })

      if (!order) {
        return ApiErrors.notFound('Order')
      }

      if (order.source === 'tost') {
        return ApiErrors.conflict('Order is already claimed by TOST')
      }

      const newId = body.newId as string | undefined
      let resultId = id
      let resultUpdatedAt: Date

      if (newId && newId !== id) {
        // Check new ID doesn't already exist
        const existing = await prisma.order.findUnique({ where: { id: newId }, select: { id: true } })
        if (existing) {
          return ApiErrors.conflict('An order with the new ID already exists')
        }

        // Replace: delete old, create new with TOST ID + all existing data
        const { id: oldId, editCode, createdAt, updatedAt, ...orderData } = order
        void oldId
        void editCode
        void updatedAt
        await prisma.$transaction([
          prisma.order.delete({ where: { id } }),
          prisma.order.create({
            data: {
              ...orderData,
              id: newId,
              source: 'tost',
              tostUserId: body.tostUserId || orderData.tostUserId || null,
              createdAt, // preserve original creation time
            },
          }),
        ])

        const created = await prisma.order.findUnique({ where: { id: newId }, select: { id: true, updatedAt: true } })
        resultId = newId
        resultUpdatedAt = created!.updatedAt
      } else {
        // Simple claim without ID change
        const updated = await prisma.order.update({
          where: { id },
          data: {
            source: 'tost',
            tostUserId: body.tostUserId || null,
          },
          select: { id: true, updatedAt: true },
        })
        resultUpdatedAt = updated.updatedAt
      }

      trackApiEvent({ name: 'tost-claim-order', url: `/api/v1/tost/claim/${id}`, data: { orderName: order.name, newId: !!newId } })

      return createApiSuccessResponse({
        id: resultId,
        name: order.name,
        updatedAt: resultUpdatedAt.toISOString(),
        message: newId && newId !== id
          ? 'Order claimed and re-keyed successfully'
          : 'Order claimed successfully',
      })
    } catch (error) {
      console.error('TOST claim POST error:', error)
      return ApiErrors.serverError('Failed to claim order')
    }
  }
)
