import { describe, it, expect } from 'vitest'
import { calculateDeliveryTrend, predictDelivery } from './prediction'
import type { Order } from './types'

/** Days from today, formatted the way the app stores dates. */
function daysFromToday(offset: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

function order(fields: Partial<Order>): Order {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'someone',
    vehicleType: 'Model Y',
    model: 'premium',
    country: 'de',
    drive: 'awd',
    orderDate: null,
    deliveryDate: null,
    vinReceivedDate: null,
    papersReceivedDate: null,
    productionDate: null,
    cancelled: false,
    archived: false,
    updatedAt: new Date(),
    ...fields,
  } as Order
}

/** Delivered `wait` days after ordering, and handed over `ago` days ago. */
function delivered(wait: number, ago: number): Order {
  return order({ orderDate: daysFromToday(-(wait + ago)), deliveryDate: daysFromToday(-ago) })
}

describe('predictDelivery — who is allowed into the sample', () => {
  it('ignores an order whose delivery has not happened yet', () => {
    // A booked delivery states what somebody expects, not what they waited. It
    // was admitted whenever the recency filter did not engage, which is 87 of
    // the 1834 live predictions — every combination too rare to fill a window.
    const past = Array.from({ length: 4 }, () => delivered(40, 500))
    const booked = order({ orderDate: daysFromToday(-10), deliveryDate: daysFromToday(+300) })

    const withoutBooked = predictDelivery([...past], 'Model Y')
    const withBooked = predictDelivery([...past, booked], 'Model Y')

    expect(withoutBooked?.sampleSize).toBe(4)
    expect(withBooked?.sampleSize).toBe(4)
  })

  it('ignores a cancelled order', () => {
    const past = Array.from({ length: 4 }, () => delivered(40, 500))
    const scrapped = order({ ...delivered(400, 500), cancelled: true })

    expect(predictDelivery([...past, scrapped], 'Model Y')?.sampleSize).toBe(4)
  })

  it('ignores an archived order', () => {
    const past = Array.from({ length: 4 }, () => delivered(40, 500))
    const shelved = order({ ...delivered(400, 500), archived: true })

    expect(predictDelivery([...past, shelved], 'Model Y')?.sampleSize).toBe(4)
  })
})

describe('predictDelivery — the figures it reports', () => {
  it('puts the quartiles in order and dates them from the order', () => {
    const sample = [10, 20, 30, 40, 50, 60, 70, 80].map(w => delivered(w, 500))

    const p = predictDelivery(sample, 'Model Y', undefined, undefined, undefined, daysFromToday(-5))

    expect(p).not.toBeNull()
    expect(p!.optimisticDays).toBeLessThanOrEqual(p!.expectedDays)
    expect(p!.expectedDays).toBeLessThanOrEqual(p!.pessimisticDays)
    expect(p!.daysElapsedFromReference).toBe(5)
  })

  it('says nothing rather than guessing from two deliveries', () => {
    expect(predictDelivery([delivered(30, 10), delivered(40, 10)], 'Model Y')).toBeNull()
  })
})

/** Delivered on the 15th of `month` (2026), after waiting `wait` days. */
function deliveredIn(month: number, wait: number): Order {
  const delivery = new Date(2026, month - 1, 15)
  const ordered = new Date(delivery)
  ordered.setDate(ordered.getDate() - wait)
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  return order({ orderDate: fmt(ordered), deliveryDate: fmt(delivery) })
}

const many = (month: number, wait: number, n: number) => Array.from({ length: n }, () => deliveredIn(month, wait))

describe('calculateDeliveryTrend — weighted by deliveries', () => {
  it('a thin month with an outlier does not swing the headline', () => {
    // Jan–Mar and Apr–May: 100 handovers each at 100 days. June: two at 400.
    // Averaging the monthly means made that +100% (decelerating); over the
    // 202 recent deliveries it is +3%, inside the stable band. Live data had
    // the same shape: July with 19 deliveries against June's 326.
    const orders = [
      ...many(1, 100, 100), ...many(2, 100, 100), ...many(3, 100, 100),
      ...many(4, 100, 100), ...many(5, 100, 100), ...many(6, 400, 2),
    ]

    const trend = calculateDeliveryTrend(orders)!

    expect(trend.trendChangePercent).toBe(3)
    expect(trend.currentTrend).toBe('stable')
  })

  it('a big month counts for what it is', () => {
    // Previous window: one month of 300 at 100 days, two months of 3 at 10 days.
    // Mean of means said 40 days; the deliveries say ~98. Recent: all at 100.
    const orders = [
      ...many(1, 100, 300), ...many(2, 10, 3), ...many(3, 10, 3),
      ...many(4, 100, 50), ...many(5, 100, 50), ...many(6, 100, 50),
    ]

    const trend = calculateDeliveryTrend(orders)!

    expect(trend.currentTrend).toBe('stable')
    expect(trend.trendChangePercent).toBe(2)
  })

  it('still reports each month on its own, with its count', () => {
    const orders = [...many(1, 50, 4), ...many(2, 60, 2), ...many(3, 70, 1)]

    expect(calculateDeliveryTrend(orders)!.monthlyAverages).toEqual([
      { monthKey: '2026-01', avgDays: 50, medianDays: 50, count: 4 },
      { monthKey: '2026-02', avgDays: 60, medianDays: 60, count: 2 },
      { monthKey: '2026-03', avgDays: 70, medianDays: 70, count: 1 },
    ])
  })

  it('leaves out a delivery dated before its order', () => {
    // One live order was handed over 240 days before it was placed.
    const orders = [...many(1, 50, 4), ...many(2, 60, 2), ...many(3, 70, 1), deliveredIn(3, -240)]

    const march = calculateDeliveryTrend(orders)!.monthlyAverages.find(m => m.monthKey === '2026-03')
    expect(march).toMatchObject({ avgDays: 70, count: 1 })
  })
})
