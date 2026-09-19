import type { ApiOrder } from './api-types'
import type { ApiConsumer } from './api-consumers'

// Fields to select (excludes editCode for security)
export const apiOrderSelect = {
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
  createdAt: true,
  updatedAt: true,
} as const

/** What identifies a person or their car. Only keys with orders:read:pii see these. */
export const PII_FIELDS = ['name', 'vin', 'tostUserId', 'deliveryLocation'] as const

export type PublicApiOrder = Omit<ApiOrder, (typeof PII_FIELDS)[number]>

/** A row as selected with apiOrderSelect. */
export type SelectedOrder = Omit<ApiOrder, 'archivedAt' | 'createdAt' | 'updatedAt'> & {
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function toApiOrder(order: SelectedOrder, consumer: ApiConsumer | null): ApiOrder | PublicApiOrder {
  const full: ApiOrder = {
    ...order,
    archivedAt: order.archivedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }
  if (consumer?.scopes.includes('orders:read:pii')) return full
  // Omitted rather than nulled, so a consumer cannot mistake "hidden" for "empty".
  const publicOrder: Partial<ApiOrder> = { ...full }
  for (const field of PII_FIELDS) delete publicOrder[field]
  return publicOrder as PublicApiOrder
}
