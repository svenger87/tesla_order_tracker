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
    // Dated 2025 on purpose: the long one used to be 28.10.2026, a date in the
    // future, which only counted as delivered because of the bug this file now
    // guards against.
    const f = getHeroFigures([
      order({ orderDate: '01.01.2025', deliveryDate: '11.01.2025' }),
      order({ orderDate: '01.01.2025', deliveryDate: '21.01.2025' }),
      order({ orderDate: '01.01.2025', deliveryDate: '28.10.2025' }),
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

describe('getHeroFigures — what the front page may claim', () => {
  const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

  test('an appointment still to come is not a delivery', () => {
    // 24 live orders sat in this state and were counted as handed over, with
    // their wait measured to a date that had not arrived.
    const f = getHeroFigures([
      order({ orderDate: '01.01.2026', deliveryDate: daysAgo(-30), updatedAt: isoDaysAgo(1) }),
    ])
    expect(f.delivered).toBe(0)
    expect(f.medianWaitDays).toBeNull()
  })

  test('an order nobody has touched for months is not someone still waiting', () => {
    const f = getHeroFigures([
      order({ orderDate: daysAgo(900), updatedAt: isoDaysAgo(300) }),
      order({ orderDate: daysAgo(60), updatedAt: isoDaysAgo(2) }),
    ])
    expect(f.waitingWithoutVin).toBe(1)
    expect(f.stale).toBe(1)
  })

  test('the longest wait comes from an order that is still being kept up to date', () => {
    // The live figure was 957 days, from a placeholder named "blank" that was
    // ordered on the first of January and never edited again.
    const f = getHeroFigures([
      order({ orderDate: daysAgo(957), updatedAt: isoDaysAgo(200) }),
      order({ orderDate: daysAgo(120), updatedAt: isoDaysAgo(1) }),
    ])
    expect(f.longestOpenWaitDays).toBe(120)
  })

  test('total still counts every live order, stale ones included', () => {
    // The count of what is in the database is a fact; hiding rows from it would
    // trade one wrong number for another.
    const f = getHeroFigures([
      order({ orderDate: daysAgo(400), updatedAt: isoDaysAgo(300) }),
      order({ orderDate: daysAgo(30), updatedAt: isoDaysAgo(1) }),
    ])
    expect(f.total).toBe(2)
  })
})

describe('getHeroFigures — the long-wait headline', () => {
  const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
  const kept = (waitDays: number) =>
    order({ orderDate: daysAgo(waitDays), updatedAt: isoDaysAgo(1) })

  test('one extreme record does not set the figure the page leads with', () => {
    // Live shape: the top of the distribution ran 269, 269, 279, 292, 440 — and
    // then 957, from a single entry. A maximum hands the headline to that one
    // record; a high percentile describes the group at the top instead.
    const orders = [
      ...Array.from({ length: 100 }, () => kept(100)),
      kept(957),
    ]
    const f = getHeroFigures(orders)
    expect(f.longOpenWaitDays).toBeLessThan(957)
    expect(f.longOpenWaitDays).toBe(100)
  })

  test('a genuinely long tail still moves it', () => {
    const orders = [
      ...Array.from({ length: 50 }, () => kept(100)),
      ...Array.from({ length: 50 }, () => kept(400)),
    ]
    expect(getHeroFigures(orders).longOpenWaitDays).toBe(400)
  })

  test('is null when nothing is open', () => {
    expect(getHeroFigures([order({ orderDate: '01.01.2025', deliveryDate: '01.02.2025' })]).longOpenWaitDays).toBeNull()
  })
})
