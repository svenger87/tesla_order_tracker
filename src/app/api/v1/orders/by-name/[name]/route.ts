import { query } from '@/lib/db'
import { ORDER_PUBLIC_COLS, transformOrderRow } from '@/lib/db-helpers'
import { NextRequest } from 'next/server'
import { withApiAuth, RouteContext } from '@/lib/api-auth'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { ApiOrder } from '@/lib/api-types'

// GET /api/v1/orders/by-name/[name] - Get orders by username
// Returns an array since a user can have multiple orders (different order dates)
export const GET = withApiAuth(
  async (request: NextRequest, context: RouteContext<{ name: string }>) => {
    try {
      const { name } = await context.params
      const decodedName = decodeURIComponent(name)

      const { searchParams } = new URL(request.url)
      const includeArchived = searchParams.get('archived') === 'true'

      let sql = `SELECT ${ORDER_PUBLIC_COLS} FROM "Order" WHERE name = ?`
      const args: unknown[] = [decodedName]

      if (!includeArchived) {
        sql += ` AND archived = 0`
      }

      sql += ` ORDER BY createdAt DESC`

      const rows = await query<Record<string, unknown>>(sql, args)
      const orders = rows.map(transformOrderRow)

      // SQLite returns dates as strings already — no .toISOString() needed
      const apiOrders: ApiOrder[] = orders.map((order) => ({
        ...order,
        archivedAt: order.archivedAt ?? null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }))

      return createApiSuccessResponse(apiOrders, { count: apiOrders.length })
    } catch (error) {
      console.error('API v1 orders by-name error:', error)
      return ApiErrors.serverError('Failed to fetch orders')
    }
  }
)
