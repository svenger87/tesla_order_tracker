import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withTostAuth } from '@/lib/tost-auth'
import { RouteContext } from '@/lib/api-auth'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'

// POST /api/v1/tost/claim/[id] - Claim an existing order for TOST
export const POST = withTostAuth(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    try {
      const { id } = await context.params
      const body = await request.json().catch(() => ({}))

      const order = await prisma.order.findUnique({
        where: { id },
        select: { id: true, source: true, name: true },
      })

      if (!order) {
        return ApiErrors.notFound('Order')
      }

      if (order.source === 'tost') {
        return ApiErrors.conflict('Order is already claimed by TOST')
      }

      const updated = await prisma.order.update({
        where: { id },
        data: {
          source: 'tost',
          tostUserId: body.tostUserId || null,
        },
        select: { id: true, name: true, updatedAt: true },
      })

      return createApiSuccessResponse({
        id: updated.id,
        name: updated.name,
        updatedAt: updated.updatedAt.toISOString(),
        message: 'Order claimed successfully',
      })
    } catch (error) {
      console.error('TOST claim POST error:', error)
      return ApiErrors.serverError('Failed to claim order')
    }
  }
)
