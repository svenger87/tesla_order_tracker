import { describe, test, expect } from 'vitest'
import { ALL_CONSTRAINTS, fillFixedValues } from './vehicle-constraints'
import { COLORS, SEATS_OPTIONS } from './types'

describe('fillFixedValues', () => {
  test('fills the range an old Performance code leaves empty', () => {
    expect(fillFixedValues({ vehicleType: 'Model Y', model: 'performance', range: null, wheels: '' }))
      .toMatchObject({ range: 'maximale_reichweite', wheels: '21', drive: 'awd', seats: '5' })
  })

  test('never overwrites what the sender reported', () => {
    expect(fillFixedValues({ vehicleType: 'Model Y', model: 'standard', interior: 'white', drive: 'rwd' }))
      .toMatchObject({ interior: 'white', drive: 'rwd', range: 'standard' })
  })

  test('leaves an order without a trim alone', () => {
    const data = { vehicleType: 'Model Y', model: null, range: null }
    expect(fillFixedValues(data)).toEqual(data)
  })
})

describe('constraint values', () => {
  test('every colour and seat count a constraint names is one the app knows', () => {
    const colors = new Set(COLORS.map(c => c.value))
    const seats = new Set(SEATS_OPTIONS.map(s => s.value))
    for (const c of ALL_CONSTRAINTS) {
      const values = Array.isArray(c.values) ? c.values : [c.values]
      if (c.targetType === 'color') for (const v of values) expect(colors, `${c.vehicleType} ${c.sourceValue}`).toContain(v)
      if (c.targetType === 'seats') for (const v of values) expect(seats, `${c.vehicleType} ${c.sourceValue}`).toContain(v)
    }
  })

  test('Model Y Premium allows the six-seat Model Y L', () => {
    const seats = ALL_CONSTRAINTS.find(c => c.vehicleType === 'Model Y' && c.sourceValue === 'premium' && c.targetType === 'seats')
    expect(seats?.values).toEqual(['5', '6', '7'])
  })
})
