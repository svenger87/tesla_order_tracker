import { describe, it, expect } from 'vitest'
import { withDerivedDurations } from './order-durations'

describe('withDerivedDurations', () => {
  it('derives every duration from the dates on the record', () => {
    const result = withDerivedDurations({
      orderDate: '01.01.2026',
      productionDate: '11.01.2026',
      vinReceivedDate: '06.01.2026',
      papersReceivedDate: '21.01.2026',
      deliveryDate: '31.01.2026',
    })

    expect(result.orderToProduction).toBe(10)
    expect(result.orderToVin).toBe(5)
    expect(result.orderToPapers).toBe(20)
    expect(result.orderToDelivery).toBe(30)
    expect(result.papersToDelivery).toBe(10)
  })

  it('reports no duration when the date it would measure from is missing', () => {
    const result = withDerivedDurations({
      orderDate: null,
      deliveryDate: '31.01.2026',
    })

    expect(result.orderToDelivery).toBeNull()
  })

  it('overwrites a duration that contradicts the dates', () => {
    // The production record this comes from: an order whose date could not be
    // read and was stored as nothing, next to a delivery duration of -477253
    // days that the spreadsheet had computed from the unread value. The two
    // arrived together and only the date was checked.
    const result = withDerivedDurations({
      orderDate: null,
      deliveryDate: '30.06.2026',
      orderToDelivery: -477253,
      orderToVin: -477254,
    })

    expect(result.orderToDelivery).toBeNull()
    expect(result.orderToVin).toBeNull()
  })

  it('leaves the rest of the record untouched', () => {
    const result = withDerivedDurations({
      name: 'ruidi99',
      vehicleType: 'Model Y',
      orderDate: '01.01.2026',
      deliveryDate: '31.01.2026',
    })

    expect(result.name).toBe('ruidi99')
    expect(result.vehicleType).toBe('Model Y')
  })
})
