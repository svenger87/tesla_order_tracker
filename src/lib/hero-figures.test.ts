import { describe, test, expect } from 'vitest'
import { getHeroFigures } from './hero-figures'
import type { Order } from './types'

const order = (o: Partial<Order>): Order => ({
  id: Math.random().toString(36).slice(2),
  name: 'x',
  vehicleType: 'Model Y',
  archived: false,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...o,
} as Order)

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

describe('getHeroFigures', () => {
  test('counts orders, excluding cancelled ones', () => {
    const f = getHeroFigures([
      order({ orderDate: '01.01.2026' }),
      order({ orderDate: '01.01.2026' }),
      order({ orderDate: '01.01.2026', cancelled: true }),
    ])
    expect(f.total).toBe(2)
  })

  test('takes the median wait, not the mean', () => {
    // 10, 20, 300 — a mean of 110 would describe none of these three.
    const f = getHeroFigures([
      order({ orderDate: '01.01.2026', deliveryDate: '11.01.2026' }),
      order({ orderDate: '01.01.2026', deliveryDate: '21.01.2026' }),
      order({ orderDate: '01.01.2026', deliveryDate: '28.10.2026' }),
    ])
    expect(f.medianWaitDays).toBe(20)
  })

  test('averages the two middle values on an even count', () => {
    const f = getHeroFigures([
      order({ orderDate: '01.01.2026', deliveryDate: '11.01.2026' }),
      order({ orderDate: '01.01.2026', deliveryDate: '21.01.2026' }),
    ])
    expect(f.medianWaitDays).toBe(15)
  })

  test('splits the waiting by whether a VIN has been assigned', () => {
    const f = getHeroFigures([
      order({ orderDate: '01.01.2026', vin: 'LRW1' }),
      order({ orderDate: '01.01.2026', vin: 'LRW2' }),
      order({ orderDate: '01.01.2026' }),
      order({ orderDate: '01.01.2026', deliveryDate: '11.01.2026', vin: 'LRW3' }),
    ])
    expect(f.delivered).toBe(1)
    expect(f.waitingWithVin).toBe(2)
    expect(f.waitingWithoutVin).toBe(1)
  })

  test('reports the longest open wait, counted to today', () => {
    const f = getHeroFigures([
      order({ orderDate: daysAgo(400) }),
      order({ orderDate: daysAgo(10) }),
    ])
    expect(f.longestOpenWaitDays).toBe(400)
  })

  test('ignores a delivered order when finding the longest open wait', () => {
    const f = getHeroFigures([
      order({ orderDate: daysAgo(400), deliveryDate: daysAgo(1) }),
      order({ orderDate: daysAgo(10) }),
    ])
    expect(f.longestOpenWaitDays).toBe(10)
  })

  test('returns nulls rather than zeros when there is nothing to measure', () => {
    const f = getHeroFigures([])
    expect(f.total).toBe(0)
    expect(f.medianWaitDays).toBeNull()
    expect(f.longestOpenWaitDays).toBeNull()
  })

  test('skips orders with an unusable order date', () => {
    const f = getHeroFigures([
      order({ orderDate: null }),
      order({ orderDate: '01.01.2026', deliveryDate: '11.01.2026' }),
    ])
    expect(f.total).toBe(2)
    expect(f.medianWaitDays).toBe(10)
  })
})
