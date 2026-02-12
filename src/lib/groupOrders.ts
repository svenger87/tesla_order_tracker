import { Order } from './types'

export interface OrderGroup {
  label: string
  year: number
  quarter: number
  orders: Order[]
}

function parseGermanDate(dateStr: string | null): Date | null {
  if (!dateStr) return null
  // Format: DD.MM.YYYY
  const parts = dateStr.split('.')
  if (parts.length !== 3) return null
  const [day, month, year] = parts.map(Number)
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  return new Date(year, month - 1, day)
}

function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1
}

function getQuarterLabel(year: number, quarter: number): string {
  return `Q${quarter} ${year}`
}

export function groupOrdersByQuarter(orders: Order[]): OrderGroup[] {
  const groups: Map<string, OrderGroup> = new Map()

  // Group orders by quarter
  orders.forEach(order => {
    const date = parseGermanDate(order.orderDate)
    let year: number
    let quarter: number

    if (date) {
      year = date.getFullYear()
      quarter = getQuarter(date)
    } else {
      // Put orders without date in "Unknown" group
      year = 0
      quarter = 0
    }

    const label = year === 0 ? 'Ohne Datum' : getQuarterLabel(year, quarter)
    const key = `${year}-${quarter}`

    if (!groups.has(key)) {
      groups.set(key, {
        label,
        year,
        quarter,
        orders: [],
      })
    }

    groups.get(key)!.orders.push(order)
  })

  // Sort groups by date (most recent first), with "Unknown" at the end
  return Array.from(groups.values()).sort((a, b) => {
    // "Ohne Datum" should be last
    if (a.year === 0) return 1
    if (b.year === 0) return -1

    // Sort by year descending, then quarter descending
    if (a.year !== b.year) return b.year - a.year
    return b.quarter - a.quarter
  })
}

export function getQuarterStats(group: OrderGroup): {
  total: number
  delivered: number
  pending: number
} {
  const total = group.orders.length
  const delivered = group.orders.filter(o => o.deliveryDate).length
  const pending = total - delivered

  return { total, delivered, pending }
}
