import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withApiAuth, RouteContext } from '@/lib/api-auth'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { ApiOrder } from '@/lib/api-types'

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

// GET /api/v1/orders/by-name/[name] - Get orders by username
// Returns an array since a user can have multiple orders (different order dates)
export const GET = withApiAuth(
  async (request: NextRequest, context: RouteContext<{ name: string }>) => {
    try {
      const { name } = await context.params
      const decodedName = decodeURIComponent(name)

      const { searchParams } = new URL(request.url)
      const includeArchived = searchParams.get('archived') === 'true'

      // Find all orders matching the username
      // Note: SQLite does case-insensitive comparison by default for LIKE
      // For exact match, we use equals which is case-sensitive
      const orders = await prisma.order.findMany({
        where: {
          name: decodedName,
          ...(!includeArchived && { archived: false }),
        },
        orderBy: { createdAt: 'desc' },
        select: orderSelectFields,
      })

      // Transform to API response format
      const apiOrders: ApiOrder[] = orders.map((order) => ({
        ...order,
        archivedAt: order.archivedAt?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      }))

      return createApiSuccessResponse(apiOrders, { count: apiOrders.length })
    } catch (error) {
      console.error('API v1 orders by-name error:', error)
      return ApiErrors.serverError('Failed to fetch orders')
    }
  }
)
