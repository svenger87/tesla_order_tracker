import { describe, test, expect } from 'vitest'
import { dateViolationsAfterUpdate, keepStoredWhenEmpty, normalizeCountryIn, timePeriodsAfterUpdate, TOST_KEEP_WHEN_EMPTY } from './order-update'

describe('keepStoredWhenEmpty', () => {
  test('an empty order date from the sync does not reach the update', () => {
    const out = keepStoredWhenEmpty({ orderDate: null, productionDate: '', vin: null, deliveryDate: '01.10.2026' }, TOST_KEEP_WHEN_EMPTY)
    expect(out).toEqual({ vin: null, deliveryDate: '01.10.2026' })
  })

  test('a real value still goes through', () => {
    expect(keepStoredWhenEmpty({ orderDate: '01.05.2026' }, TOST_KEEP_WHEN_EMPTY)).toEqual({ orderDate: '01.05.2026' })
  })
})

describe('timePeriodsAfterUpdate', () => {
  test('uses the stored order date when the update only brings a delivery date', () => {
    const p = timePeriodsAfterUpdate({ orderDate: '01.05.2026', productionDate: '01.06.2026' }, { deliveryDate: '11.06.2026' })
    expect(p).toMatchObject({ orderToProduction: 31, orderToDelivery: 41 })
  })

  test('clears what can no longer be worked out', () => {
    const p = timePeriodsAfterUpdate({ orderDate: '01.05.2026', deliveryDate: '11.06.2026' }, { orderDate: null })
    expect(p).toEqual({ orderToProduction: null, orderToVin: null, orderToDelivery: null, orderToPapers: null, papersToDelivery: null })
  })
})

describe('normalizeCountryIn', () => {
  test('gb becomes uk; a missing country stays missing', () => {
    expect(normalizeCountryIn({ country: 'GB' })).toEqual({ country: 'uk' })
    expect(normalizeCountryIn({ vin: 'X' })).toEqual({ vin: 'X' })
  })
})

describe('dateViolationsAfterUpdate', () => {
  test('a patch is judged next to the stored dates', () => {
    const stored = { orderDate: '10.05.2026', vinReceivedDate: null, deliveryDate: null }
    const v = dateViolationsAfterUpdate(stored, { deliveryDate: '01.05.2026' })
    expect(v.map(x => x.code)).toEqual(['DELIVERY_BEFORE_ORDER'])
  })

  test('moving the stored order date past a stored delivery is caught', () => {
    const stored = { orderDate: '01.05.2026', deliveryDate: '20.05.2026' }
    expect(dateViolationsAfterUpdate(stored, { orderDate: '21.05.2026' }).map(x => x.code)).toEqual(['DELIVERY_BEFORE_ORDER'])
  })

  test('an order that is already wrong stays editable where the edit does not touch the conflict', () => {
    // Delivered 240 days before ordered, as on the live site.
    const stored = { orderDate: '01.09.2026', deliveryDate: '04.01.2026', vinReceivedDate: null }
    expect(dateViolationsAfterUpdate(stored, { name: 'renamed', vin: 'LRW…' })).toEqual([])
  })

  test('but not where the edit touches it and keeps it wrong', () => {
    const stored = { orderDate: '01.09.2026', deliveryDate: '04.01.2026' }
    expect(dateViolationsAfterUpdate(stored, { deliveryDate: '05.01.2026' })).toHaveLength(1)
    expect(dateViolationsAfterUpdate(stored, { deliveryDate: '05.09.2026' })).toEqual([])
  })

  test('a create (nothing stored) counts everything', () => {
    expect(dateViolationsAfterUpdate(null, { orderDate: '10.05.2026', deliveryDate: '01.05.2026' }).map(x => x.code))
      .toEqual(['DELIVERY_BEFORE_ORDER'])
  })
})
