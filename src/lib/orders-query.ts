import { prisma } from '@/lib/db'
import type { Order } from '@/lib/types'

/**
 * The single definition of "the order list".
 *
 * Both `GET /api/orders` and the server-rendered home page read through here.
 * They used to be able to drift: the route JSON-serialised its Prisma rows,
 * while anything rendering on the server would have handed `Date` objects to a
 * client component typed for strings — a mismatch that only shows up as a
 * hydration warning or a silently wrong "last updated" cell.
 */
const ORDER_FIELDS = {
  id: true,
  name: true,
  vehicleType: true,
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
  seats: true,
  source: true,
  tostUserId: true,
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
  cancelled: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
} as const

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

/**
 * Fetch the orders exactly as the client expects them — dates as ISO strings,
 * not Date objects.
 */
export async function fetchOrders({ includeArchived = false } = {}): Promise<Order[]> {
  let rows: Record<string, unknown>[]

  try {
    rows = await prisma.order.findMany({
      where: includeArchived ? {} : { archived: false },
      orderBy: { createdAt: 'desc' },
      select: ORDER_FIELDS,
    })
  } catch {
    // Pre-dates the archive columns. migrate-schema.mjs adds them on deploy, so
    // this only covers a database that has not been through a container start.
    const { archived, archivedAt, cancelled, cancelledAt, updatedAt, ...rest } = ORDER_FIELDS
    void archived; void archivedAt; void cancelled; void cancelledAt; void updatedAt
    rows = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      select: rest,
    })
    rows = rows.map(row => ({
      ...row,
      archived: false,
      archivedAt: null,
      cancelled: false,
      cancelledAt: null,
      updatedAt: row.createdAt,
    }))
  }

  return rows.map(row => ({
    ...row,
    archivedAt: toIso(row.archivedAt as Date | null),
    cancelledAt: toIso(row.cancelledAt as Date | null),
    createdAt: toIso(row.createdAt as Date) ?? '',
    updatedAt: toIso(row.updatedAt as Date | null) ?? undefined,
  })) as unknown as Order[]
}
