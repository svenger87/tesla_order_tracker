import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withApiAuth, getApiConsumer, RouteContext } from '@/lib/api-auth'
import { apiOrderSelect, toApiOrder } from '@/lib/api-order'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'

// GET /api/v1/orders/by-name/[name] - Get orders by username
// Returns an array since a user can have multiple orders (different order dates)
export const GET = withApiAuth({ scope: 'orders:read:pii', route: 'GET /v1/orders/by-name/[name]' },
  async (request: NextRequest, context: RouteContext<{ name: string }>) => {
    try {
      const { name } = await context.params
      const decodedName = decodeURIComponent(name)

      const { searchParams } = new URL(request.url)
      const includeArchived = searchParams.get('archived') === 'true'

      // Find all orders matching the username
      const trimmedName = decodedName.trim()
      const orders = await prisma.order.findMany({
        where: {
          name: trimmedName,
          ...(!includeArchived && { archived: false }),
        },
        orderBy: { createdAt: 'desc' },
        select: apiOrderSelect,
      })

      // Transform to API response format
      const consumer = getApiConsumer(request)
      const apiOrders = orders.map((order) => toApiOrder(order, consumer))

      return createApiSuccessResponse(apiOrders, { count: apiOrders.length })
    } catch (error) {
      console.error('API v1 orders by-name error:', error)
      return ApiErrors.serverError('Failed to fetch orders')
    }
  }
)
