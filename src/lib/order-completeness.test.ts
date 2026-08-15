import { describe, it, expect } from 'vitest'
import { missingMilestones, isUnreliable, recordedMilestones } from './order-completeness'

const full = {
  orderDate: '01.01.2026',
  vinReceivedDate: '10.01.2026',
  productionDate: '15.01.2026',
  papersReceivedDate: '20.01.2026',
  deliveryDate: '25.01.2026',
}

describe('missingMilestones', () => {
  it('finds nothing on a fully recorded order', () => {
    expect(missingMilestones(full)).toEqual([])
  })

  it('finds nothing on an order that has simply not got there yet', () => {
    // Ordered, nothing else recorded. That is not a half-filled entry, that is
    // somebody at the start of the queue — flagging it would mean flagging
    // everyone who is still waiting.
    expect(missingMilestones({ orderDate: '01.01.2026' })).toEqual([])
  })

  it('finds a milestone skipped over by a later one', () => {
    // A car cannot be delivered without having been produced. If the delivery
    // date is there and the production date is not, that step happened and was
    // never written down.
    expect(missingMilestones({ ...full, productionDate: null })).toEqual(['productionDate'])
  })

  it('ignores an unreadable date the same as an absent one', () => {
    expect(missingMilestones({ ...full, productionDate: '12.' })).toEqual(['productionDate'])
  })
})

describe('isUnreliable', () => {
  it('marks an order whose own start is missing', () => {
    // 29 live orders carry a later date without an order date. Every waiting
    // time is measured from that date, so these are the records that cannot be
    // checked against anything — the rest are merely sparse.
    expect(isUnreliable({ ...full, orderDate: null })).toBe(true)
    expect(isUnreliable({ deliveryDate: '25.01.2026' })).toBe(true)
  })

  it('leaves a sparse but coherent order alone', () => {
    // Papers go unrecorded on a fifth of all orders and on 20% of delivered
    // ones. That is how people use the form, not a fault, and calling it
    // unreliable would put a warning on entries that are perfectly usable.
    expect(isUnreliable({ ...full, papersReceivedDate: null })).toBe(false)
    expect(isUnreliable({ ...full, vinReceivedDate: null })).toBe(false)
    expect(isUnreliable(full)).toBe(false)
  })

  it('leaves an order that has not started yet alone', () => {
    expect(isUnreliable({ orderDate: '01.01.2026' })).toBe(false)
    expect(isUnreliable({})).toBe(false)
  })
})

describe('recordedMilestones', () => {
  it('counts what is actually written down', () => {
    expect(recordedMilestones(full)).toEqual({ recorded: 5, total: 5 })
    expect(recordedMilestones({ orderDate: '01.01.2026' })).toEqual({ recorded: 1, total: 5 })
    expect(recordedMilestones({})).toEqual({ recorded: 0, total: 5 })
  })
})
