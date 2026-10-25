import { describe, expect, it } from 'vitest'
import { deliveryCenterOptions } from './delivery-centers'

describe('Tesla delivery center suggestions', () => {
  it('contains the distinct locations found in Tesla\'s published directories', () => {
    const all = deliveryCenterOptions()
    expect(all).toHaveLength(218)
    expect(new Set(all.map(center => `${center.country}:${center.value}`)).size).toBe(all.length)
    expect(all.some(center => center.country === 'us' && center.city === 'Mesa')).toBe(true)
  })

  it('filters suggestions to the order country', () => {
    const canada = deliveryCenterOptions('ca')
    expect(canada).toHaveLength(23)
    expect(canada.every(center => center.country === 'ca')).toBe(true)
    expect(deliveryCenterOptions('il')).toEqual([])
  })
})
