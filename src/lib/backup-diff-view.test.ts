import { describe, it, expect } from 'vitest'
import { toRows, filterRows, changedFieldCounts } from './backup-diff-view'
import type { OrderDiff } from './backup-diff'

const diff: OrderDiff = {
  added: [{ id: 'n1', name: 'Stitchmaster' }],
  removed: [{ id: 'r1', name: 'Weggefallen' }],
  changed: [
    {
      id: 'c1',
      name: 'Velo',
      fields: [
        { field: 'deliveryWindow', from: '01.11.2026 - 31.12.2026', to: '28. Oktober - 27. November' },
        { field: 'orderToVin', from: 74, to: 82 },
      ],
    },
    { id: 'c2', name: 'StefanD', fields: [{ field: 'deliveryWindow', from: 'a', to: 'b' }] },
    { id: 'c3', name: 'Rojo', fields: [{ field: 'vinReceivedDate', from: null, to: '01.08.2026' }] },
  ],
}

describe('toRows', () => {
  it('puts all three kinds into one list', () => {
    // One list, not three: a search for a name has to work whether that order
    // was added, lost or edited, and the reader does not know which in advance.
    const rows = toRows(diff)

    expect(rows).toHaveLength(5)
    expect(rows.map(r => r.kind).sort()).toEqual(['added', 'changed', 'changed', 'changed', 'removed'])
  })

  it('carries the field count so the list can be ranked by it', () => {
    const velo = toRows(diff).find(r => r.name === 'Velo')
    expect(velo?.fields).toHaveLength(2)
  })
})

describe('filterRows — searching', () => {
  it('finds an order by name, whatever its kind', () => {
    const rows = toRows(diff)
    expect(filterRows(rows, { query: 'velo' }).map(r => r.name)).toEqual(['Velo'])
    expect(filterRows(rows, { query: 'stitch' }).map(r => r.name)).toEqual(['Stitchmaster'])
  })

  it('finds an order by what changed in it', () => {
    // "who got a new delivery window" is the question this view exists for, and
    // the field name is not visible until a row is expanded.
    const names = filterRows(toRows(diff), { query: 'deliveryWindow' }).map(r => r.name)
    expect(names.sort()).toEqual(['StefanD', 'Velo'])
  })

  it('finds an order by a value on either side of a change', () => {
    expect(filterRows(toRows(diff), { query: '28. Oktober' }).map(r => r.name)).toEqual(['Velo'])
    expect(filterRows(toRows(diff), { query: '31.12.2026' }).map(r => r.name)).toEqual(['Velo'])
  })

  it('ignores case and surrounding spaces', () => {
    expect(filterRows(toRows(diff), { query: '  VELO ' }).map(r => r.name)).toEqual(['Velo'])
  })
})

describe('filterRows — narrowing', () => {
  it('keeps only one kind', () => {
    expect(filterRows(toRows(diff), { kind: 'added' }).map(r => r.name)).toEqual(['Stitchmaster'])
    expect(filterRows(toRows(diff), { kind: 'removed' }).map(r => r.name)).toEqual(['Weggefallen'])
  })

  it('keeps only orders where one particular field moved', () => {
    const names = filterRows(toRows(diff), { field: 'deliveryWindow' }).map(r => r.name)
    expect(names.sort()).toEqual(['StefanD', 'Velo'])
  })

  it('drops added and removed orders when a field is selected', () => {
    // Neither has fields to have changed, so including them under "orders whose
    // delivery window moved" would be an answer to a different question.
    expect(filterRows(toRows(diff), { field: 'orderToVin' }).map(r => r.name)).toEqual(['Velo'])
  })

  it('combines a search with a filter', () => {
    const rows = toRows(diff)
    expect(filterRows(rows, { query: 'e', kind: 'changed', field: 'deliveryWindow' }).map(r => r.name).sort())
      .toEqual(['StefanD', 'Velo'])
  })
})

describe('filterRows — ordering', () => {
  it('sorts by name by default', () => {
    expect(filterRows(toRows(diff), {}).map(r => r.name))
      .toEqual(['Rojo', 'StefanD', 'Stitchmaster', 'Velo', 'Weggefallen'])
  })

  it('puts the most-changed orders first when asked', () => {
    const rows = filterRows(toRows(diff), { sort: 'changes' })
    expect(rows[0].name).toBe('Velo')
  })

  it('breaks a tie on the field count by name, so the order never wobbles', () => {
    const rows = filterRows(toRows(diff), { sort: 'changes' }).slice(1).map(r => r.name)
    expect(rows).toEqual(['Rojo', 'StefanD', 'Stitchmaster', 'Weggefallen'])
  })
})

describe('changedFieldCounts', () => {
  it('counts how many orders each field moved in, commonest first', () => {
    // This is what fills the field filter, and the counts are the reason to use
    // it: 348 changes are unreadable, "121 of them are papersToDelivery" is not.
    expect(changedFieldCounts(diff)).toEqual([
      { field: 'deliveryWindow', count: 2 },
      { field: 'orderToVin', count: 1 },
      { field: 'vinReceivedDate', count: 1 },
    ])
  })
})
