// Shared sorting for Option lists (API routes, useOptions hook, admin OptionsManager).
//
// Option types whose entries form an open-ended, naturally alphabetical list.
// These ignore sortOrder entirely — admin-added entries would otherwise be
// appended at the end (and collide with existing sortOrder values).
export const ALPHABETICAL_OPTION_TYPES = new Set<string>(['country', 'deliveryLocation'])

// German locale handles umlauts (Ö sorts like O); base sensitivity ignores case.
export function compareOptionLabels(a: string, b: string, locale: string = 'de'): number {
  return a.localeCompare(b, locale, { sensitivity: 'base' })
}

interface SortableOption {
  type: string
  label: string
  sortOrder: number
}

export function compareOptions(a: SortableOption, b: SortableOption): number {
  if (a.type !== b.type) return a.type.localeCompare(b.type)
  if (ALPHABETICAL_OPTION_TYPES.has(a.type)) {
    return compareOptionLabels(a.label, b.label)
  }
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  return a.label.localeCompare(b.label)
}
