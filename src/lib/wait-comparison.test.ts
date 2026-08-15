import { describe, test, expect } from 'vitest'
import { getWaitComparison } from './wait-comparison'
import type { Order } from './types'

const o = (p: Partial<Order>): Order => ({ id: 'x', name: 'x', vehicleType: 'Model Y', ...p } as Order)

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

describe('getWaitComparison', () => {
  test('counts a delivered order from order to handover', () => {
    const r = getWaitComparison(o({ orderDate: '01.01.2026', deliveryDate: '11.02.2026' }), [])
    expect(r?.waitedDays).toBe(41)
    expect(r?.isDelivered).toBe(true)
  })

  test('counts an open order up to today', () => {
    const r = getWaitComparison(o({ orderDate: daysAgo(73) }), [])
    expect(r?.waitedDays).toBe(73)
    expect(r?.isDelivered).toBe(false)
  })

  test('treats a delivery date in the future as still waiting', () => {
    // A scheduled handover has not happened. Counting to that date and calling
    // it "waited" would tell someone they are done when the car is not here.
    const inSevenDays = new Date()
    inSevenDays.setDate(inSevenDays.getDate() + 7)
    const future = `${String(inSevenDays.getDate()).padStart(2, '0')}.${String(inSevenDays.getMonth() + 1).padStart(2, '0')}.${inSevenDays.getFullYear()}`

    const r = getWaitComparison(o({ orderDate: daysAgo(40), deliveryDate: future }), [])
    expect(r?.isDelivered).toBe(false)
    expect(r?.waitedDays).toBe(40)
  })

  test('compares against the median of comparable deliveries', () => {
    const comparable = [
      o({ orderDate: '01.01.2026', deliveryDate: '31.01.2026' }), // 30
      o({ orderDate: '01.01.2026', deliveryDate: '10.02.2026' }), // 40
      o({ orderDate: '01.01.2026', deliveryDate: '20.02.2026' }), // 50
    ]
    const r = getWaitComparison(o({ orderDate: '01.01.2026', deliveryDate: '11.02.2026' }), comparable)
    expect(r?.comparableMedian).toBe(40)
    expect(r?.differenceDays).toBe(1)
  })

  test('reports a negative difference when faster than comparable orders', () => {
    const comparable = [o({ orderDate: '01.01.2026', deliveryDate: '20.02.2026' })] // 50
    const r = getWaitComparison(o({ orderDate: '01.01.2026', deliveryDate: '31.01.2026' }), comparable)
    expect(r?.differenceDays).toBe(-20)
  })

  test('leaves the comparison out when there is nothing to compare against', () => {
    const r = getWaitComparison(o({ orderDate: '01.01.2026', deliveryDate: '11.02.2026' }), [])
    expect(r?.comparableMedian).toBeNull()
    expect(r?.differenceDays).toBeNull()
  })

  test('ignores comparable orders that never got delivered', () => {
    const comparable = [
      o({ orderDate: '01.01.2026', deliveryDate: '31.01.2026' }),
      o({ orderDate: '01.01.2026' }),
    ]
    const r = getWaitComparison(o({ orderDate: '01.01.2026', deliveryDate: '11.02.2026' }), comparable)
    expect(r?.comparableMedian).toBe(30)
  })

  test('returns null without a usable order date', () => {
    expect(getWaitComparison(o({ orderDate: null }), [])).toBeNull()
    expect(getWaitComparison(o({ orderDate: 'Quatsch' }), [])).toBeNull()
  })
})

describe('getWaitComparison — which orders it compares against', () => {
  const mk = (o: Partial<Order>): Order => ({
    id: Math.random().toString(36).slice(2),
    name: 'x', vehicleType: 'Model 3', archived: false, archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z', ...o,
  } as Order)

  test('a scheduled delivery is not a completed wait', () => {
    // A date still to come says when the car is expected, not how long anyone
    // waited. Counting it dragged the comparison toward whatever was booked.
    const self = mk({ orderDate: '01.06.2026' })
    const future = new Date(Date.now() + 30 * 86_400_000)
    const dd = `${String(future.getDate()).padStart(2, '0')}.${String(future.getMonth() + 1).padStart(2, '0')}.${future.getFullYear()}`
    const result = getWaitComparison(self, [
      mk({ orderDate: '01.01.2025', deliveryDate: '20.03.2025' }), // 78 days, real
      mk({ orderDate: '01.06.2026', deliveryDate: dd }),           // scheduled
    ])
    expect(result?.comparableMedian).toBe(78)
  })

  test('uses every comparable order it is given, not a slice of them', () => {
    // The page passed the first eight rows it happened to have. The median of
    // an arbitrary eight is arbitrary: reconstructing that selection from a
    // different ordering of the same data produced 87 days where the live page
    // showed 30, for the same order.
    const self = mk({ orderDate: '01.06.2026' })
    const many = Array.from({ length: 26 }, (_, i) =>
      mk({ orderDate: '01.01.2025', deliveryDate: `${String((i % 28) + 1).padStart(2, '0')}.03.2025` }))
    const result = getWaitComparison(self, many)
    expect(result?.comparableMedian).not.toBeNull()
  })
})
