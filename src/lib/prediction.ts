import { Order, MODEL_Y_TRIMS, MODEL_3_TRIMS, COLORS, DRIVES, COUNTRIES } from './types'
import { parseGermanDate, calculateDaysBetween, getOrderStatus } from './statistics'

// Resolve internal value to display label
function resolveLabel(value: string, dimension: 'model' | 'color' | 'drive' | 'country'): string {
  const allOptions: { value: string; label: string }[] = (() => {
    switch (dimension) {
      case 'model': return [...MODEL_Y_TRIMS, ...MODEL_3_TRIMS]
      case 'color': return COLORS
      case 'drive': return DRIVES
      case 'country': return COUNTRIES
    }
  })()
  const match = allOptions.find(o => o.value === value || o.label.toLowerCase() === value.toLowerCase())
  return match?.label || value
}

export interface DeliveryPrediction {
  optimisticDays: number
  expectedDays: number
  pessimisticDays: number
  optimisticDate: string
  expectedDate: string
  pessimisticDate: string
  confidence: 'high' | 'medium' | 'low'
  sampleSize: number
  filtersUsed: string[]
  /** Width of the recency window applied to the sample (in days). Null = no recency filter (full history). */
  recencyWindowDays: number | null
  /** Days already elapsed since the reference milestone (orderDate or the latest segment milestone).
   * When this exceeds expectedDays/pessimisticDays the historical prediction is unreliable. */
  daysElapsedFromReference: number
}

export interface DeliveryTrend {
  monthlyAverages: { month: string; avgDays: number; medianDays: number; count: number }[]
  currentTrend: 'accelerating' | 'decelerating' | 'stable'
  trendChangePercent: number
}

export interface ConfigDeliveryInsight {
  dimension: string
  values: { name: string; avgDays: number; medianDays: number; count: number }[]
}

export interface VinActivity {
  weeklyData: { week: string; count: number }[]
  thisWeek: number
  lastWeek: number
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
}

function formatGermanDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function percentile(sorted: number[], p: number): number {
  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return Math.round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower))
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

// Determine which pipeline segment to predict from, based on current order status.
// Returns the "from" date field, "from" date value, and a label for that segment.
function getSegment(order: Order): { fromField: 'productionDate' | 'papersReceivedDate' | 'vinReceivedDate' | 'orderDate'; fromDate: string; segmentLabel: string } | null {
  const status = getOrderStatus(order)

  // Pick the latest known milestone as the reference point
  if ((status === 'papers_received' || status === 'delivery_scheduled') && order.papersReceivedDate) {
    return { fromField: 'papersReceivedDate', fromDate: order.papersReceivedDate, segmentLabel: 'papers→delivery' }
  }
  if (status === 'production' && order.productionDate) {
    return { fromField: 'productionDate', fromDate: order.productionDate, segmentLabel: 'production→delivery' }
  }
  if (status === 'vin_received' && order.vinReceivedDate) {
    return { fromField: 'vinReceivedDate', fromDate: order.vinReceivedDate, segmentLabel: 'vin→delivery' }
  }
  if (order.orderDate) {
    return { fromField: 'orderDate', fromDate: order.orderDate, segmentLabel: 'order→delivery' }
  }
  return null
}

export function predictDelivery(
  orders: Order[],
  vehicleType: string,
  model?: string,
  country?: string,
  drive?: string,
  orderDate?: string,
  /** Pass the full order to enable status-aware "remaining time" prediction */
  currentOrder?: Order,
): DeliveryPrediction | null {
  const filtersUsed: string[] = []

  // Start with strict filters, progressively relax
  let candidates = orders.filter(o => o.deliveryDate && o.vehicleType === vehicleType)
  filtersUsed.push(vehicleType)

  if (model && candidates.filter(o => o.model === model).length >= 5) {
    candidates = candidates.filter(o => o.model === model)
    filtersUsed.push(model)
  }

  if (country && candidates.filter(o => o.country === country).length >= 5) {
    candidates = candidates.filter(o => o.country === country)
    filtersUsed.push(country)
  }

  if (drive && candidates.filter(o => o.drive === drive).length >= 3) {
    candidates = candidates.filter(o => o.drive === drive)
    filtersUsed.push(drive)
  }

  // Recency filter: prefer recently delivered orders so the prediction reflects
  // current market conditions rather than older Tesla delivery dynamics. Try a
  // tight window first; widen progressively if the sample becomes too small.
  // `null` means "fall back to full history" — communicated to the UI.
  const RECENCY_WINDOWS = [120, 180, 365] as const
  const MIN_SAMPLE = 10
  const today = new Date()
  let recencyWindowDays: number | null = null
  for (const win of RECENCY_WINDOWS) {
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() - win)
    const recent = candidates.filter(o => {
      const dd = parseGermanDate(o.deliveryDate)
      return dd !== null && dd >= cutoff && dd <= today
    })
    if (recent.length >= MIN_SAMPLE) {
      candidates = recent
      recencyWindowDays = win
      break
    }
  }

  // Dynamic segment: if a current order is provided and has progressed past "ordered",
  // predict remaining time from the latest milestone instead of from order date.
  const segment = currentOrder ? getSegment(currentOrder) : null
  const useSegment = segment && segment.fromField !== 'orderDate'

  let deliveryDays: number[]
  let refDate: Date

  if (useSegment) {
    // Calculate segment durations from similar delivered orders
    deliveryDays = candidates
      .map(o => {
        const fromVal = o[segment.fromField]
        return fromVal ? calculateDaysBetween(fromVal, o.deliveryDate) : null
      })
      .filter((d): d is number => d !== null && d >= 0)
      .sort((a, b) => a - b)

    // Reference date = the milestone date on the current order
    refDate = parseGermanDate(segment.fromDate) || new Date()
    filtersUsed.push(segment.segmentLabel)
  } else {
    // Default: order date → delivery date
    deliveryDays = candidates
      .map(o => calculateDaysBetween(o.orderDate, o.deliveryDate))
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b)

    const baseDate = orderDate ? parseGermanDate(orderDate) : new Date()
    refDate = baseDate || new Date()
  }

  if (deliveryDays.length < 3) return null

  const p25 = percentile(deliveryDays, 25)
  const p50 = percentile(deliveryDays, 50)
  const p75 = percentile(deliveryDays, 75)

  const confidence: DeliveryPrediction['confidence'] =
    deliveryDays.length >= 30 ? 'high' : deliveryDays.length >= 10 ? 'medium' : 'low'

  const daysElapsedFromReference = Math.max(
    0,
    Math.floor((Date.now() - refDate.getTime()) / 86_400_000),
  )

  return {
    optimisticDays: p25,
    expectedDays: p50,
    pessimisticDays: p75,
    optimisticDate: formatGermanDate(addDays(refDate, p25)),
    expectedDate: formatGermanDate(addDays(refDate, p50)),
    pessimisticDate: formatGermanDate(addDays(refDate, p75)),
    confidence,
    sampleSize: deliveryDays.length,
    filtersUsed,
    recencyWindowDays,
    daysElapsedFromReference,
  }
}

export function calculateDeliveryTrend(orders: Order[]): DeliveryTrend | null {
  const delivered = orders.filter(o => o.deliveryDate)

  // Group by delivery month
  const monthMap: Record<string, number[]> = {}
  delivered.forEach(o => {
    const date = parseGermanDate(o.deliveryDate)
    const days = calculateDaysBetween(o.orderDate, o.deliveryDate)
    if (date && days !== null) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthMap[key]) monthMap[key] = []
      monthMap[key].push(days)
    }
  })

  const months = Object.keys(monthMap).sort()
  if (months.length < 3) return null

  const monthlyAverages = months.map(month => {
    const days = monthMap[month]
    const avg = Math.round(days.reduce((s, d) => s + d, 0) / days.length)
    const med = median(days)
    const [year, m] = month.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return {
      month: `${monthNames[parseInt(m) - 1]} ${year}`,
      avgDays: avg,
      medianDays: med,
      count: days.length,
    }
  })

  // Compare last 3 months avg to previous 3 months
  const recent3 = monthlyAverages.slice(-3)
  const previous3 = monthlyAverages.slice(-6, -3)

  if (previous3.length < 2) {
    return { monthlyAverages, currentTrend: 'stable', trendChangePercent: 0 }
  }

  const recentAvg = recent3.reduce((s, m) => s + m.avgDays, 0) / recent3.length
  const previousAvg = previous3.reduce((s, m) => s + m.avgDays, 0) / previous3.length

  const changePercent = previousAvg > 0 ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100) : 0

  let currentTrend: DeliveryTrend['currentTrend'] = 'stable'
  if (changePercent <= -5) currentTrend = 'accelerating'
  else if (changePercent >= 5) currentTrend = 'decelerating'

  return { monthlyAverages, currentTrend, trendChangePercent: Math.abs(changePercent) }
}

export function calculateConfigInsights(
  orders: Order[],
  dimension: 'model' | 'color' | 'drive' | 'country'
): ConfigDeliveryInsight {
  const delivered = orders.filter(o => o.deliveryDate)
  const groups: Record<string, number[]> = {}

  // Check if data contains multiple vehicle types (for model dimension disambiguation)
  const vehicleTypes = new Set(delivered.map(o => o.vehicleType).filter(Boolean))
  const hasMultipleVehicles = vehicleTypes.size > 1

  delivered.forEach(o => {
    const days = calculateDaysBetween(o.orderDate, o.deliveryDate)
    if (days === null) return

    let rawKey: string | null = null
    switch (dimension) {
      case 'model': rawKey = o.model; break
      case 'color': rawKey = o.color; break
      case 'drive': rawKey = o.drive; break
      case 'country': rawKey = o.country; break
    }
    if (!rawKey) return

    let key = resolveLabel(rawKey, dimension)
    // Prefix model names with vehicle type when both MY and M3 are present
    if (dimension === 'model' && hasMultipleVehicles && o.vehicleType) {
      const vt = o.vehicleType === 'Model Y' ? 'MY' : o.vehicleType === 'Model 3' ? 'M3' : o.vehicleType
      key = `${vt} ${key}`
    }
    if (!groups[key]) groups[key] = []
    groups[key].push(days)
  })

  const values = Object.entries(groups)
    .filter(([, days]) => days.length >= 3)
    .map(([name, days]) => ({
      name,
      avgDays: Math.round(days.reduce((s, d) => s + d, 0) / days.length),
      medianDays: median(days),
      count: days.length,
    }))
    .sort((a, b) => a.medianDays - b.medianDays)

  return { dimension, values }
}

export function calculateVinActivity(orders: Order[]): VinActivity | null {
  const withVin = orders.filter(o => o.vinReceivedDate)
  if (withVin.length < 5) return null

  // Group by ISO week
  const weekMap: Record<string, number> = {}
  withVin.forEach(o => {
    const date = parseGermanDate(o.vinReceivedDate)
    if (!date) return
    // ISO week calculation
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
    const week1 = new Date(d.getFullYear(), 0, 4)
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
    const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
    weekMap[key] = (weekMap[key] || 0) + 1
  })

  const weeks = Object.keys(weekMap).sort()
  const weeklyData = weeks.slice(-12).map(week => ({ week, count: weekMap[week] }))

  const thisWeek = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].count : 0
  const lastWeek = weeklyData.length > 1 ? weeklyData[weeklyData.length - 2].count : 0

  let trend: VinActivity['trend'] = 'stable'
  let trendPercent = 0
  if (lastWeek > 0) {
    trendPercent = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
    if (trendPercent >= 10) trend = 'up'
    else if (trendPercent <= -10) trend = 'down'
  }

  return { weeklyData, thisWeek, lastWeek, trend, trendPercent: Math.abs(trendPercent) }
}
