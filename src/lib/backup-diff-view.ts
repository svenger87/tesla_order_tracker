import type { FieldChange, OrderDiff } from './backup-diff'

/**
 * Turning a comparison into something a person can actually work through.
 *
 * A real sync produced 359 entries — 348 edited, 11 new — and three flat lists
 * of that length answer no question anybody has. What an admin wants is "who
 * got a new delivery window", "did this person change", "what moved the most".
 * That needs one searchable list rather than three, because the reader does not
 * know in advance whether the order they are looking for was added, lost or
 * edited.
 *
 * Kept free of React so the rules can be tested directly.
 */

export type DiffKind = 'added' | 'removed' | 'changed'

export type DiffRow = {
  id: string
  name: string
  kind: DiffKind
  fields: FieldChange[]
}

export type SortKey = 'name' | 'changes'

export type FilterOptions = {
  query?: string
  kind?: DiffKind | 'all'
  field?: string | 'all'
  sort?: SortKey
}

export function toRows(diff: OrderDiff): DiffRow[] {
  return [
    ...diff.removed.map(o => ({ ...o, kind: 'removed' as const, fields: [] })),
    ...diff.changed.map(o => ({ ...o, kind: 'changed' as const })),
    ...diff.added.map(o => ({ ...o, kind: 'added' as const, fields: [] })),
  ]
}

/** Everything a search should be able to reach on one row. */
function haystack(row: DiffRow): string {
  const parts = [row.name]
  for (const f of row.fields) {
    parts.push(f.field, String(f.from ?? ''), String(f.to ?? ''))
  }
  return parts.join(' ').toLowerCase()
}

export function filterRows(rows: DiffRow[], options: FilterOptions): DiffRow[] {
  const query = options.query?.trim().toLowerCase() ?? ''
  const kind = options.kind ?? 'all'
  const field = options.field ?? 'all'
  const sort = options.sort ?? 'name'

  const kept = rows.filter(row => {
    if (kind !== 'all' && row.kind !== kind) return false
    // An added or removed order has no fields that moved, so it cannot be an
    // answer to "which orders had this field change" — including it would be
    // answering a different question than the one that was asked.
    if (field !== 'all' && !row.fields.some(f => f.field === field)) return false
    if (query && !haystack(row).includes(query)) return false
    return true
  })

  const byName = (a: DiffRow, b: DiffRow) => a.name.localeCompare(b.name, 'de')

  return kept.sort((a, b) => {
    if (sort === 'changes' && a.fields.length !== b.fields.length) {
      return b.fields.length - a.fields.length
    }
    // Name is the tiebreak as well as the default, so equal rows never swap
    // places between renders.
    return byName(a, b)
  })
}

/**
 * How many orders each field moved in, commonest first.
 *
 * This fills the field filter, and the counts are the point of it: "348 orders
 * changed" is unreadable, "121 of them are papersToDelivery" is a finding.
 */
export function changedFieldCounts(diff: OrderDiff): { field: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const order of diff.changed) {
    for (const f of order.fields) {
      counts.set(f.field, (counts.get(f.field) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count || a.field.localeCompare(b.field))
}
