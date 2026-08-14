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
