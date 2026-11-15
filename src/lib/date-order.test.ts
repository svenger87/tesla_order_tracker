import { describe, test, expect } from 'vitest'
import {
  blamedField,
  changedDateFields,
  dateOrderViolationsIntroduced,
  describeViolation,
  findDateOrderViolations,
} from './date-order'

const codes = (data: Record<string, unknown>) => findDateOrderViolations(data).map(v => v.code)

describe('findDateOrderViolations', () => {
  test('accepts a plausible chronology, VIN after production included', () => {
    expect(codes({
      orderDate: '01.01.2026',
      vinReceivedDate: '15.03.2026',
      productionDate: '01.03.2026',
      papersReceivedDate: '10.03.2026',
      deliveryDate: '20.03.2026',
    })).toEqual([])
  })

  test('same day is fine everywhere', () => {
    const d = '01.03.2026'
    expect(codes({ orderDate: d, vinReceivedDate: d, productionDate: d, papersReceivedDate: d, deliveryDate: d })).toEqual([])
  })

  test('allows a VIN and production before the order date (stock cars)', () => {
    expect(codes({ orderDate: '20.03.2026', vinReceivedDate: '05.03.2026', productionDate: '01.03.2026' })).toEqual([])
  })

  test.each([
    ['papersReceivedDate', 'PAPERS_BEFORE_ORDER'],
    ['deliveryDate', 'DELIVERY_BEFORE_ORDER'],
  ])('rejects %s one day before the order date', (field, code) => {
    expect(codes({ orderDate: '02.03.2026', [field]: '01.03.2026' })).toEqual([code])
  })

  test('rejects delivery before the VIN', () => {
    expect(codes({ orderDate: '01.01.2026', vinReceivedDate: '10.03.2026', deliveryDate: '09.03.2026' }))
      .toEqual(['DELIVERY_BEFORE_VIN'])
  })

  test('the live case: delivered 240 days before it was ordered', () => {
    const v = findDateOrderViolations({ orderDate: '01.09.2026', deliveryDate: '04.01.2026' })
    expect(v).toHaveLength(1)
    expect(describeViolation(v[0])).toBe('deliveryDate (04.01.2026) is before orderDate (01.09.2026)')
  })

  test('keeps the existing production → papers → delivery rules', () => {
    expect(codes({ productionDate: '10.03.2026', papersReceivedDate: '01.03.2026' })).toEqual(['PAPERS_BEFORE_PRODUCTION'])
    expect(codes({ papersReceivedDate: '10.03.2026', deliveryDate: '01.03.2026' })).toEqual(['DELIVERY_BEFORE_PAPERS'])
  })

  test('rejects an order date in the future but allows a planned delivery', () => {
    const now = new Date(2026, 10, 15)
    expect(findDateOrderViolations({ orderDate: '16.11.2026' }, now).map(v => v.code)).toEqual(['ORDER_DATE_IN_FUTURE'])
    expect(findDateOrderViolations({ orderDate: '15.11.2026', deliveryDate: '01.06.2027' }, now)).toEqual([])
  })

  test('ignores absent, empty and unreadable dates', () => {
    expect(codes({})).toEqual([])
    expect(codes({ orderDate: '', deliveryDate: '01.01.2026' })).toEqual([])
    expect(codes({ orderDate: 'gestern', deliveryDate: '01.01.2026' })).toEqual([])
    expect(codes({ orderDate: null, vinReceivedDate: undefined, deliveryDate: '01.01.2026' })).toEqual([])
  })
})

describe('dateOrderViolationsIntroduced — updates judge the merged order', () => {
  const badStored = { orderDate: '01.09.2026', deliveryDate: '04.01.2026', vinReceivedDate: null, productionDate: null }

  test('a new order: every violation counts', () => {
    expect(dateOrderViolationsIntroduced(null, badStored).map(v => v.code)).toEqual(['DELIVERY_BEFORE_ORDER'])
  })

  test('a patch that is fine alone but not next to the stored dates is refused', () => {
    const stored = { orderDate: '01.06.2026', deliveryDate: null }
    const next = { ...stored, papersReceivedDate: '01.05.2026' }
    expect(dateOrderViolationsIntroduced(stored, next).map(v => v.code)).toEqual(['PAPERS_BEFORE_ORDER'])
  })

  test('a stored conflict the edit does not touch does not block it', () => {
    // A rename, or a type approval: no date changes, so the old conflict is not this edit's.
    expect(dateOrderViolationsIntroduced(badStored, { ...badStored, name: 'renamed', typeApproval: 'e1*2018/858' })).toEqual([])
  })

  test('a new date that clashes with a stored wrong one is still refused', () => {
    // Production after the order is fine on its own, but it lands after the
    // stored (wrong) handover. The form shows which date it clashes with.
    const next = { ...badStored, productionDate: '10.09.2026' }
    expect(dateOrderViolationsIntroduced(badStored, next).map(v => v.code)).toEqual(['DELIVERY_BEFORE_PRODUCTION'])
  })

  test('re-sending the stored values unchanged (the full web form) is not a change', () => {
    expect(dateOrderViolationsIntroduced(badStored, { ...badStored, vinReceivedDate: '' })).toEqual([])
  })

  test('changing one side of a stored conflict without fixing it is refused', () => {
    const next = { ...badStored, deliveryDate: '05.01.2026' }
    expect(dateOrderViolationsIntroduced(badStored, next).map(v => v.code)).toEqual(['DELIVERY_BEFORE_ORDER'])
  })

  test('fixing the conflict lets it through', () => {
    const next = { ...badStored, deliveryDate: '05.09.2026' }
    expect(dateOrderViolationsIntroduced(badStored, next)).toEqual([])
  })

  test('moving the order date past a stored delivery is refused', () => {
    const stored = { orderDate: '01.01.2026', deliveryDate: '01.03.2026' }
    expect(dateOrderViolationsIntroduced(stored, { ...stored, orderDate: '02.03.2026' }).map(v => v.code))
      .toEqual(['DELIVERY_BEFORE_ORDER'])
  })
})

describe('blamedField', () => {
  test('the field the person changed carries the message', () => {
    const stored = { orderDate: '01.01.2026', deliveryDate: '01.03.2026' }
    const next = { ...stored, orderDate: '02.03.2026' }
    const [v] = findDateOrderViolations(next)
    expect(blamedField(v, changedDateFields(stored, next))).toBe('orderDate')
  })

  test('on a new order it is the date that came too early', () => {
    const next = { orderDate: '02.03.2026', deliveryDate: '01.03.2026' }
    const [v] = findDateOrderViolations(next)
    expect(blamedField(v, changedDateFields(null, next))).toBe('deliveryDate')
  })
})
