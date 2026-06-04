import { Order } from './types'
import { calculateDaysBetween, parseGermanDate } from './statistics'

export interface DeliverySegmentInsight {
  label: string
  medianDays: number
  count: number
}

export interface OrderInsights {
  totalOrders: number
  deliveredOrders: number
  pendingOrders: number
  deliveryRate: number
  avgDeliveryDays: number | null
  medianDeliveryDays: number | null
  medianPendingAgeDays: number | null
  vinsThisWeek: number
  vinsPreviousWeek: number
  topCountry: { label: string; count: number } | null
  topVehicle: { label: string; count: number; share: number } | null
  nextDeliveryPeriod: string | null
  fastestConfig: DeliverySegmentInsight | null
  slowestConfig: DeliverySegmentInsight | null
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2)
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function formatConfigLabel(order: Order): string {
  return [
    order.vehicleType,
    order.model,
    order.drive?.toUpperCase(),
  ].filter(Boolean).join(' · ')
}

function calculateConfigExtremes(orders: Order[]): {
  fastestConfig: DeliverySegmentInsight | null
  slowestConfig: DeliverySegmentInsight | null
} {
  const groups = new Map<string, number[]>()

  for (const order of orders) {
    const days = calculateDaysBetween(order.orderDate, order.deliveryDate)
    if (days === null) continue

    const label = formatConfigLabel(order)
    if (!label) continue
    const values = groups.get(label) ?? []
    values.push(days)
    groups.set(label, values)
  }

  const segments = Array.from(groups.entries())
    .map(([label, values]) => ({
      label,
      medianDays: median(values),
      count: values.length,
    }))
    .filter((segment): segment is DeliverySegmentInsight => segment.count >= 3 && segment.medianDays !== null)
    .sort((a, b) => a.medianDays - b.medianDays)

  return {
    fastestConfig: segments[0] ?? null,
    slowestConfig: segments[segments.length - 1] ?? null,
  }
}

function calculateVinWeeks(orders: Order[], nowMs: number) {
  const now = new Date(nowMs)
  const localDay = now.getDay() || 7
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - localDay + 1)
  weekStart.setHours(0, 0, 0, 0)
  const previousWeekStart = new Date(weekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)

  let vinsThisWeek = 0
  let vinsPreviousWeek = 0

  for (const order of orders) {
    const vinDate = parseGermanDate(order.vinReceivedDate)
    if (!vinDate) continue
    if (vinDate >= weekStart) vinsThisWeek += 1
    else if (vinDate >= previousWeekStart && vinDate < weekStart) vinsPreviousWeek += 1
  }

  return { vinsThisWeek, vinsPreviousWeek }
}

function calculateTopCountry(orders: Order[]) {
  const counts = new Map<string, number>()
  for (const order of orders) {
    if (!order.country) continue
    const country = order.country.trim().toUpperCase()
    if (!country) continue
    counts.set(country, (counts.get(country) ?? 0) + 1)
  }

  const [label, count] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? []
  return label && count ? { label, count } : null
}

function calculateTopVehicle(orders: Order[]) {
  const counts = new Map<string, number>()
  for (const order of orders) {
    if (!order.vehicleType) continue
    counts.set(order.vehicleType, (counts.get(order.vehicleType) ?? 0) + 1)
  }

  const [label, count] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? []
  return label && count ? { label, count, share: Math.round((count / orders.length) * 100) } : null
}

function formatQuarter(date: Date): string {
  return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
}

function calculateNextDeliveryPeriod(orders: Order[], nowMs: number): string | null {
  const now = new Date(nowMs)
  now.setHours(0, 0, 0, 0)

  const futureDeliveryQuarters = orders
    .map((order) => parseGermanDate(order.deliveryDate))
    .filter((date): date is Date => date !== null && date >= now)
    .map(formatQuarter)

  if (futureDeliveryQuarters.length > 0) {
    const counts = new Map<string, number>()
    for (const quarter of futureDeliveryQuarters) counts.set(quarter, (counts.get(quarter) ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  }

  const deliveryWindowQuarters = orders
    .map((order) => order.deliveryWindow?.match(/Q[1-4]\s*20\d{2}/i)?.[0]?.toUpperCase().replace(/\s+/, ' '))
    .filter((quarter): quarter is string => Boolean(quarter))

  if (deliveryWindowQuarters.length === 0) return null
  const counts = new Map<string, number>()
  for (const quarter of deliveryWindowQuarters) counts.set(quarter, (counts.get(quarter) ?? 0) + 1)
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

export function calculateOrderInsights(orders: Order[], nowMs: number): OrderInsights {
  const deliveredOrders = orders.filter((order) => Boolean(order.deliveryDate))
  const pendingOrders = orders.filter((order) => !order.deliveryDate)
  const deliveryDays = deliveredOrders
    .map((order) => calculateDaysBetween(order.orderDate, order.deliveryDate))
    .filter((value): value is number => value !== null)

  const today = new Date(nowMs)
  today.setHours(0, 0, 0, 0)
  const pendingAges = pendingOrders
    .map((order) => {
      const orderDate = parseGermanDate(order.orderDate)
      if (!orderDate) return null
      const days = Math.round((today.getTime() - orderDate.getTime()) / 86_400_000)
      return days >= 0 ? days : null
    })
    .filter((value): value is number => value !== null)

  const { fastestConfig, slowestConfig } = calculateConfigExtremes(deliveredOrders)
  const { vinsThisWeek, vinsPreviousWeek } = calculateVinWeeks(orders, nowMs)

  return {
    totalOrders: orders.length,
    deliveredOrders: deliveredOrders.length,
    pendingOrders: pendingOrders.length,
    deliveryRate: orders.length ? Math.round((deliveredOrders.length / orders.length) * 100) : 0,
    avgDeliveryDays: average(deliveryDays),
    medianDeliveryDays: median(deliveryDays),
    medianPendingAgeDays: median(pendingAges),
    vinsThisWeek,
    vinsPreviousWeek,
    topCountry: calculateTopCountry(orders),
    topVehicle: calculateTopVehicle(orders),
    nextDeliveryPeriod: calculateNextDeliveryPeriod(orders, nowMs),
    fastestConfig,
    slowestConfig,
  }
}
