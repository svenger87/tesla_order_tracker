import { describe, test, expect } from 'vitest'
import { toApiOrder, PII_FIELDS, type SelectedOrder } from './api-order'
import type { ApiConsumer } from './api-consumers'

const order = {
  id: 'o1', name: 'sven', vehicleType: 'Model Y', orderDate: '01.01.2026', country: 'ca',
  model: null, range: null, drive: null, color: null, interior: null, wheels: null,
  towHitch: null, autopilot: null, seats: null, source: 'tost', tostUserId: 'u1',
  deliveryWindow: null, deliveryLocation: 'Toronto', vin: 'LRW123', vinReceivedDate: null,
  papersReceivedDate: null, productionDate: null, typeApproval: null, typeVariant: null,
  deliveryDate: null, orderToProduction: null, orderToVin: null, orderToDelivery: null,
  orderToPapers: null, papersToDelivery: null, archived: false, archivedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-02T00:00:00Z'),
} satisfies SelectedOrder

const consumer = (scopes: ApiConsumer['scopes']): ApiConsumer => ({
  id: 'k', name: 'k', builtin: false, scopes, ratePerMinute: 60, quotaPerDay: 5000,
})

describe('toApiOrder', () => {
  test('omits PII fields without orders:read:pii', () => {
    const out = toApiOrder(order, consumer(['orders:read']))
    for (const field of PII_FIELDS) expect(out).not.toHaveProperty(field)
    expect(out).toMatchObject({ id: 'o1', country: 'ca', createdAt: '2026-01-01T00:00:00.000Z' })
  })

  test('keeps PII fields with orders:read:pii', () => {
    const out = toApiOrder(order, consumer(['orders:read', 'orders:read:pii']))
    expect(out).toMatchObject({ name: 'sven', vin: 'LRW123', tostUserId: 'u1', deliveryLocation: 'Toronto' })
  })

  test('strips when no consumer is known', () => {
    expect(toApiOrder(order, null)).not.toHaveProperty('vin')
  })
})
