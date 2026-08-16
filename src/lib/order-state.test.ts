import { describe, it, expect } from 'vitest'
import { isHandedOver, isStaleOpen, startOfToday, STALE_AFTER_DAYS, countsTowardStats } from './order-state'

const TODAY = new Date(2026, 7, 15) // 15.08.2026, local midnight
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * 86_400_000).toISOString()

describe('isHandedOver', () => {
  it('counts a delivery in the past', () => {
    expect(isHandedOver({ deliveryDate: '01.07.2026' }, TODAY)).toBe(true)
  })

  it('counts a delivery dated today', () => {
    expect(isHandedOver({ deliveryDate: '15.08.2026' }, TODAY)).toBe(true)
  })

  it('does not count an appointment still to come', () => {
    // The live site reported 24 of these as delivered and measured their wait
    // to a day that had not happened, which is the bug this exists for.
    expect(isHandedOver({ deliveryDate: '01.09.2026' }, TODAY)).toBe(false)
  })

  it('does not count a missing or unparseable date', () => {
    expect(isHandedOver({ deliveryDate: '' }, TODAY)).toBe(false)
    expect(isHandedOver({ deliveryDate: null }, TODAY)).toBe(false)
    expect(isHandedOver({ deliveryDate: 'irgendwann' }, TODAY)).toBe(false)
  })
})

describe('isStaleOpen', () => {
  it('flags an open order nobody has touched past the threshold', () => {
    expect(isStaleOpen({ deliveryDate: null, updatedAt: daysAgo(200) }, TODAY)).toBe(true)
  })

  it('leaves an open order alone while it is still being kept up to date', () => {
    expect(isStaleOpen({ deliveryDate: null, updatedAt: daysAgo(10) }, TODAY)).toBe(false)
  })

  it('judges by the last edit, not by how long the wait is', () => {
    // A two-year wait its owner still tends is exactly what the site is for.
    expect(isStaleOpen({ deliveryDate: null, updatedAt: daysAgo(3) }, TODAY)).toBe(false)
  })

  it('never flags a delivered order', () => {
    expect(isStaleOpen({ deliveryDate: '01.02.2026', updatedAt: daysAgo(300) }, TODAY)).toBe(false)
  })

  it('treats an order with a future appointment as open, and can flag it', () => {
    expect(isStaleOpen({ deliveryDate: '01.09.2026', updatedAt: daysAgo(200) }, TODAY)).toBe(true)
  })

  it('takes a caller-supplied threshold', () => {
    const order = { deliveryDate: null, updatedAt: daysAgo(100) }
    expect(isStaleOpen(order, TODAY, 90)).toBe(true)
    expect(isStaleOpen(order, TODAY, 120)).toBe(false)
  })

  it('keeps an order whose last edit is unknown or unreadable', () => {
    // Missing metadata is not evidence of abandonment; dropping those would
    // quietly shrink the queue for a reason that has nothing to do with the
    // person waiting.
    expect(isStaleOpen({ deliveryDate: null, updatedAt: undefined }, TODAY)).toBe(false)
    expect(isStaleOpen({ deliveryDate: null, updatedAt: 'kaputt' }, TODAY)).toBe(false)
  })

  it('uses 180 days unless told otherwise', () => {
    expect(STALE_AFTER_DAYS).toBe(180)
    expect(isStaleOpen({ deliveryDate: null, updatedAt: daysAgo(179) }, TODAY)).toBe(false)
    expect(isStaleOpen({ deliveryDate: null, updatedAt: daysAgo(181) }, TODAY)).toBe(true)
  })
})

describe('startOfToday', () => {
  it('strips the time so day arithmetic is not off by hours', () => {
    const t = startOfToday(new Date(2026, 7, 15, 23, 59, 59))
    expect(t.getHours()).toBe(0)
    expect(t.getDate()).toBe(15)
  })
})

describe('countsTowardStats', () => {
  it('counts an ordinary order', () => {
    expect(countsTowardStats({ cancelled: false, archived: false })).toBe(true)
  })

  it('drops a cancelled order', () => {
    expect(countsTowardStats({ cancelled: true, archived: false })).toBe(false)
  })

  it('drops an archived order', () => {
    // Archived orders were already hidden from the public list but still counted
    // in every average, so the same page reported different numbers depending on
    // whether an admin was logged in.
    expect(countsTowardStats({ cancelled: false, archived: true })).toBe(false)
  })

  it('treats a missing flag as not set', () => {
    expect(countsTowardStats({})).toBe(true)
  })
})
