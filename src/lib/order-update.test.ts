import { describe, test, expect } from 'vitest'
import { keepStoredWhenEmpty, normalizeCountryIn, timePeriodsAfterUpdate, TOST_KEEP_WHEN_EMPTY } from './order-update'

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
