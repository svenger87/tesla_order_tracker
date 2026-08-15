import { describe, it, expect } from 'vitest'
import { predictDelivery } from './prediction'
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
