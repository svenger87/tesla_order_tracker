import { describe, it, expect } from 'vitest'
import { calculateDaysBetween, parseGermanDate, calculateStatistics } from './statistics'
import type { Order } from './types'

function order(fields: Partial<Order>): Order {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'someone',
    vehicleType: 'Model Y',
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

describe('parseGermanDate', () => {
  it('reads a date in the format the app stores', () => {
    expect(parseGermanDate('15.08.2026')?.getFullYear()).toBe(2026)
  })

  it('rejects a date the calendar does not have', () => {
    // 31.02. used to pass: the check was day <= 31 and month <= 12, so February
    // the 31st became March the 3rd and quietly shifted somebody's wait.
    expect(parseGermanDate('31.02.2026')).toBeNull()
  })

  it('still works for a year beyond the window someone hardcoded', () => {
    // The bound was `year > 2030`, written as a sanity check. It is a deadline:
    // every order placed after it would drop out of every statistic on the site,
    // with no error anywhere.
    expect(parseGermanDate('01.03.2031')).not.toBeNull()
  })
})

describe('calculateDaysBetween', () => {
  it('counts the days between two dates', () => {
    expect(calculateDaysBetween('01.01.2026', '31.01.2026')).toBe(30)
  })

  it('refuses an order that arrives before it was placed', () => {
    expect(calculateDaysBetween('31.01.2026', '01.01.2026')).toBeNull()
  })

  it('keeps a wait longer than a year', () => {
    // Discarded as "unreasonably large" at 366 days. The longest real wait in
    // the data is 218 days, so nothing is being dropped today — but the rule
    // deletes exactly the waits this site exists to make visible, and it does it
    // silently. A year is not an implausible wait for a car.
    expect(calculateDaysBetween('01.01.2025', '01.03.2026')).toBe(424)
  })
})

describe('calculateStatistics — the milestone averages', () => {
  it('says how many orders each average was built from', () => {
    // Each average runs over whatever subset carries the dates it needs, so
    // "order to papers" is measured over different people than "order to
    // delivery". That is fine and unavoidable — what was not fine was hiding it:
    // when one exceeded the other the code replaced it with null, so a figure
    // vanished from the page and nothing said why. The sizes are now reported
    // instead, and nothing is suppressed.
    const orders = [
      order({ orderDate: '01.01.2026', papersReceivedDate: '21.01.2026', deliveryDate: '31.01.2026' }),
      order({ orderDate: '01.01.2026', deliveryDate: '01.03.2026' }),
    ]

    const stats = calculateStatistics(orders)

    expect(stats.avgOrderToDelivery).toBe(45)
    expect(stats.sampleSizes.orderToDelivery).toBe(2)
    expect(stats.avgOrderToPapers).toBe(20)
    expect(stats.sampleSizes.orderToPapers).toBe(1)
  })

  it('keeps a stage average that is longer than the average total', () => {
    // Two different populations can legitimately produce this. The order with
    // papers took 100 days to reach them; the one without was delivered in 10.
    // Suppressing the papers figure told the reader nothing; reporting both with
    // their sizes tells them exactly what they are looking at.
    const stats = calculateStatistics([
      order({ orderDate: '01.01.2026', papersReceivedDate: '11.04.2026', deliveryDate: '21.04.2026' }),
      order({ orderDate: '01.01.2026', deliveryDate: '11.01.2026' }),
    ])

    expect(stats.avgOrderToPapers).toBe(100)
    expect(stats.avgOrderToDelivery).toBe(60)
  })
})

describe('calculateStatistics — segment detail', () => {
  it('counts a stage that took no time at all', () => {
    // Zero-day values were filtered out as "data quality issues". Papers signed
    // on handover day is an ordinary Tuesday, not a broken record — and dropping
    // 36 of the 726 real papers-to-delivery values pushed that average from
    // 9.5 days up to 10.2.
    const stats = calculateStatistics([
      order({ orderDate: '01.01.2026', papersReceivedDate: '31.01.2026', deliveryDate: '31.01.2026' }),
      order({ orderDate: '01.01.2026', papersReceivedDate: '21.01.2026', deliveryDate: '31.01.2026' }),
    ])

    expect(stats.segmentPapersToDelivery.count).toBe(2)
    expect(stats.segmentPapersToDelivery.avg).toBe(5)
    expect(stats.segmentPapersToDelivery.min).toBe(0)
  })
})
