import { Order, COLORS } from './types'

// Normalize country codes to full names
const COUNTRY_NAMES: Record<string, string> = {
  'DE': 'Deutschland',
  'AT': 'Österreich',
  'CH': 'Schweiz',
  'NL': 'Nederland',
  'PL': 'Polen',
  'PT': 'Portugal',
  'ES': 'Spanien',
  'FR': 'Frankreich',
  'IT': 'Italien',
  'BE': 'Belgien',
  'LU': 'Luxemburg',
  'DK': 'Dänemark',
  'SE': 'Schweden',
  'NO': 'Norwegen',
  'FI': 'Finnland',
  'CZ': 'Tschechien',
  'SK': 'Slowakei',
  'HU': 'Ungarn',
  'UK': 'Großbritannien',
  'GB': 'Großbritannien',
  'IE': 'Irland',
}

function normalizeCountry(country: string | null | undefined): string {
  if (!country || country === '-') return 'Unbekannt'
  let trimmed = country.trim()

  // Remove flag emoji prefix (flag emojis are regional indicator symbols)
  // They appear as pairs like 🇩🇪 🇦🇹 etc.
  trimmed = trimmed.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '')

  // Check if it's a 2-letter country code (exact match)
  const upper = trimmed.toUpperCase()
  if (COUNTRY_NAMES[upper]) {
    return COUNTRY_NAMES[upper]
  }

  // Check if format is "XX CountryName" (e.g., "DE Deutschland")
  const match = trimmed.match(/^([A-Z]{2})\s+(.+)$/i)
  if (match) {
    const code = match[1].toUpperCase()
    const name = match[2]
    return COUNTRY_NAMES[code] || name
  }

  // Normalize common country name variations
  const COUNTRY_ALIASES: Record<string, string> = {
    'SPANJE': 'Spanien',
    'LUXEMBOURG': 'Luxemburg',
  }
  if (COUNTRY_ALIASES[upper]) {
    return COUNTRY_ALIASES[upper]
  }

  // Return as-is if no pattern matches
  return trimmed
}

export interface OrderStatistics {
  totalOrders: number
  deliveredOrders: number
  pendingOrders: number
  ordersWithoutDate: number
  avgOrderToVin: number | null
  avgOrderToDelivery: number | null
  avgOrderToPapers: number | null
  avgPapersToDelivery: number | null
  modelDistribution: { name: string; count: number; fill: string }[]
  rangeDistribution: { name: string; count: number; fill: string }[]
  countryDistribution: { name: string; count: number; fill: string }[]
  ordersOverTime: { month: string; count: number }[]
  // New statistics
  deliveriesOverTime: { month: string; count: number }[]
  waitTimeDistribution: { range: string; count: number; min: number; max: number }[]
  wheelsDistribution: { name: string; count: number; fill: string }[]
  interiorDistribution: { name: string; count: number; fill: string }[]
  autopilotDistribution: { name: string; count: number; fill: string }[]
  driveDistribution: { name: string; count: number; fill: string }[]
  towHitchDistribution: { name: string; count: number; fill: string }[]
  colorDistribution: { name: string; count: number; fill: string }[]
  deliveryLocationDistribution: { name: string; count: number; fill: string }[]
}

// Period filter types
export type StatsPeriod =
  | { type: 'all' }
  | { type: 'quarter'; year: number; quarter: number }
  | { type: 'year'; year: number }

// Get available years and quarters from orders
export function getAvailablePeriods(orders: Order[]): { years: number[]; quarters: { year: number; quarter: number }[] } {
  const years = new Set<number>()
  const quarters = new Set<string>()

  orders.forEach(order => {
    const date = parseGermanDate(order.orderDate)
    if (date) {
      const year = date.getFullYear()
      const quarter = Math.floor(date.getMonth() / 3) + 1
      years.add(year)
      quarters.add(`${year}-${quarter}`)
    }
  })

  return {
    years: Array.from(years).sort((a, b) => b - a),
    quarters: Array.from(quarters)
      .map(q => {
        const [year, quarter] = q.split('-').map(Number)
        return { year, quarter }
      })
      .sort((a, b) => b.year - a.year || b.quarter - a.quarter),
  }
}

// Filter orders by period
export function filterOrdersByPeriod(orders: Order[], period: StatsPeriod): Order[] {
  if (period.type === 'all') return orders

  return orders.filter(order => {
    const date = parseGermanDate(order.orderDate)
    if (!date) return false

    const year = date.getFullYear()
    const quarter = Math.floor(date.getMonth() / 3) + 1

    if (period.type === 'year') {
      return year === period.year
    }
    if (period.type === 'quarter') {
      return year === period.year && quarter === period.quarter
    }
    return true
  })
}

const MODEL_COLORS: Record<string, string> = {
  'Standard': 'var(--chart-2)',
  'Premium': 'var(--chart-3)',
  'Performance': 'var(--chart-1)',
}

const COUNTRY_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

const CONFIG_COLORS = [
  'oklch(0.55 0.22 25)',   // Tesla Red
  'oklch(0.65 0.15 220)',  // Blue
  'oklch(0.70 0.12 160)',  // Teal
  'oklch(0.75 0.15 80)',   // Yellow
  'oklch(0.60 0.18 280)',  // Purple
]

// Build a color lookup map for finding hex colors by label
const COLOR_HEX_MAP = new Map<string, string>()
COLORS.forEach(c => {
  // Add lowercase versions for matching
  COLOR_HEX_MAP.set(c.label.toLowerCase(), c.hex)
  // Also add partial matches
  c.label.toLowerCase().split(' ').forEach(word => {
    if (word.length > 3) COLOR_HEX_MAP.set(word, c.hex)
  })
})

function findColorHex(colorName: string): string | null {
  const lower = colorName.toLowerCase()
  // Exact match first
  if (COLOR_HEX_MAP.has(lower)) return COLOR_HEX_MAP.get(lower)!
  // Try partial match
  for (const [key, hex] of COLOR_HEX_MAP) {
    if (lower.includes(key) || key.includes(lower)) return hex
  }
  return null
}

// Normalize wheel sizes (e.g., "20", "20\"", "20 Zoll" -> "20\"")
function normalizeWheels(wheels: string | null | undefined): string {
  if (!wheels) return 'Unbekannt'
  const trimmed = wheels.trim()
  // Extract just the number
  const match = trimmed.match(/(\d{2})/)
  if (match) {
    return `${match[1]}"`
  }
  return trimmed
}

function calculateAverage(values: (number | null)[]): number | null {
  const validValues = values.filter((v): v is number => v !== null && !isNaN(v) && v >= 0)
  if (validValues.length === 0) return null
  const sum = validValues.reduce((acc, val) => acc + val, 0)
  return Math.round(sum / validValues.length)
}

function parseGermanDate(dateStr: string | null): Date | null {
  if (!dateStr) return null
  // Format: DD.MM.YYYY
  const parts = dateStr.split('.')
  if (parts.length !== 3) return null
  const [day, month, year] = parts.map(Number)
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  // Validate reasonable date ranges
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2020 || year > 2030) return null
  return new Date(year, month - 1, day)
}

// Calculate days between two German-format date strings
// Returns null if either date is invalid or if the result would be negative
function calculateDaysBetween(startDateStr: string | null, endDateStr: string | null): number | null {
  const startDate = parseGermanDate(startDateStr)
  const endDate = parseGermanDate(endDateStr)
  if (!startDate || !endDate) return null

  const diffMs = endDate.getTime() - startDate.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  // Return null for negative values (invalid data) or unreasonably large values (> 1 year)
  if (diffDays < 0 || diffDays > 365) return null
  return diffDays
}

function getMonthKey(date: Date): string {
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

export function calculateStatistics(orders: Order[], period?: StatsPeriod): OrderStatistics {
  // Filter orders by period if specified
  const filteredOrders = period ? filterOrdersByPeriod(orders, period) : orders

  const totalOrders = filteredOrders.length
  const deliveredOrders = filteredOrders.filter(o => o.deliveryDate).length
  const pendingOrders = totalOrders - deliveredOrders
  const ordersWithoutDate = filteredOrders.filter(o => !parseGermanDate(o.orderDate)).length

  // Calculate averages from delivered orders
  const deliveredOrdersList = filteredOrders.filter(o => o.deliveryDate)

  // Total delivery time: all delivered orders
  const avgOrderToDelivery = calculateAverage(
    deliveredOrdersList.map(o => calculateDaysBetween(o.orderDate, o.deliveryDate))
  )

  // VIN time: only from orders with VIN date (subset)
  const avgOrderToVin = calculateAverage(
    deliveredOrdersList.map(o => calculateDaysBetween(o.orderDate, o.vinReceivedDate))
  )

  // Papers stats: only from orders with papers date (subset)
  // These might be from different sample sizes, so we cap them at avgOrderToDelivery for logical consistency
  const rawAvgOrderToPapers = calculateAverage(
    deliveredOrdersList.map(o => calculateDaysBetween(o.orderDate, o.papersReceivedDate))
  )
  const rawAvgPapersToDelivery = calculateAverage(
    deliveredOrdersList.map(o => calculateDaysBetween(o.papersReceivedDate, o.deliveryDate))
  )

  // If intermediate stats exceed total delivery time, show null (data inconsistency)
  const avgOrderToPapers = rawAvgOrderToPapers !== null && avgOrderToDelivery !== null && rawAvgOrderToPapers > avgOrderToDelivery
    ? null : rawAvgOrderToPapers
  const avgPapersToDelivery = rawAvgPapersToDelivery

  // Model distribution
  const modelCounts: Record<string, number> = {}
  filteredOrders.forEach(order => {
    const model = order.model || 'Unbekannt'
    modelCounts[model] = (modelCounts[model] || 0) + 1
  })
  const modelDistribution = Object.entries(modelCounts)
    .map(([model, count]) => ({
      name: model,
      count,
      fill: MODEL_COLORS[model] || 'var(--chart-4)',
    }))
    .sort((a, b) => b.count - a.count)

  // Range (Reichweite) distribution - all models (Performance = Max RW, Standard = Standard)
  const RANGE_COLORS: Record<string, string> = {
    'Maximale Reichweite': 'var(--chart-2)',
    'Standard': 'var(--chart-3)',
  }
  const rangeCounts: Record<string, number> = {}
  filteredOrders.forEach(order => {
    const range = order.range || 'Unbekannt'
    rangeCounts[range] = (rangeCounts[range] || 0) + 1
  })
  const rangeDistribution = Object.entries(rangeCounts)
    .map(([name, count], index) => ({
      name,
      count,
      fill: RANGE_COLORS[name] || CONFIG_COLORS[index % CONFIG_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)

  // Country distribution - normalize country codes to full names
  const countryCounts: Record<string, number> = {}
  filteredOrders.forEach(order => {
    const country = normalizeCountry(order.country)
    countryCounts[country] = (countryCounts[country] || 0) + 1
  })
  const countryDistribution = Object.entries(countryCounts)
    .map(([country, count], index) => ({
      name: country,
      count,
      fill: COUNTRY_COLORS[index % COUNTRY_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10 countries

  // Orders over time - NO 12-month limit, show all data for the period
  const monthCounts: Record<string, { date: Date; count: number }> = {}
  filteredOrders.forEach(order => {
    const date = parseGermanDate(order.orderDate)
    if (date) {
      const key = getMonthKey(date)
      if (!monthCounts[key]) {
        monthCounts[key] = { date: new Date(date.getFullYear(), date.getMonth(), 1), count: 0 }
      }
      monthCounts[key].count++
    }
  })

  // Sort chronologically using stored Date objects (fixes fragile string parsing)
  const ordersOverTime = Object.entries(monthCounts)
    .map(([month, { count }]) => ({ month, count }))
    .sort((a, b) => {
      const aData = monthCounts[a.month]
      const bData = monthCounts[b.month]
      return aData.date.getTime() - bData.date.getTime()
    })
  // REMOVED: .slice(-12) - Now shows all data for the selected period

  // Deliveries over time (by delivery date)
  const deliveryMonthCounts: Record<string, { date: Date; count: number }> = {}
  filteredOrders.forEach(order => {
    const date = parseGermanDate(order.deliveryDate)
    if (date) {
      const key = getMonthKey(date)
      if (!deliveryMonthCounts[key]) {
        deliveryMonthCounts[key] = { date: new Date(date.getFullYear(), date.getMonth(), 1), count: 0 }
      }
      deliveryMonthCounts[key].count++
    }
  })
  const deliveriesOverTime = Object.entries(deliveryMonthCounts)
    .map(([month, { count }]) => ({ month, count }))
    .sort((a, b) => {
      const aData = deliveryMonthCounts[a.month]
      const bData = deliveryMonthCounts[b.month]
      return aData.date.getTime() - bData.date.getTime()
    })

  // Wait time distribution (order to delivery in days) - calculated from dates
  const waitTimeRanges = [
    { range: '0-30', min: 0, max: 30, count: 0 },
    { range: '31-60', min: 31, max: 60, count: 0 },
    { range: '61-90', min: 61, max: 90, count: 0 },
    { range: '91-120', min: 91, max: 120, count: 0 },
    { range: '121-150', min: 121, max: 150, count: 0 },
    { range: '151-180', min: 151, max: 180, count: 0 },
    { range: '180+', min: 181, max: 365, count: 0 },
  ]
  filteredOrders.forEach(order => {
    const days = calculateDaysBetween(order.orderDate, order.deliveryDate)
    if (days !== null) {
      const range = waitTimeRanges.find(r => days >= r.min && days <= r.max)
      if (range) range.count++
    }
  })
  const waitTimeDistribution = waitTimeRanges.filter(r => r.count > 0)

  // Wheels distribution (normalized)
  const wheelsCounts: Record<string, number> = {}
  filteredOrders.forEach(order => {
    const wheels = normalizeWheels(order.wheels)
    wheelsCounts[wheels] = (wheelsCounts[wheels] || 0) + 1
  })
  const wheelsDistribution = Object.entries(wheelsCounts)
    .map(([name, count], index) => ({
      name,
      count,
      fill: CONFIG_COLORS[index % CONFIG_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)

  // Interior distribution
  const interiorCounts: Record<string, number> = {}
  filteredOrders.forEach(order => {
    const interior = order.interior || 'Unbekannt'
    interiorCounts[interior] = (interiorCounts[interior] || 0) + 1
  })
  const interiorDistribution = Object.entries(interiorCounts)
    .map(([name, count], index) => ({
      name,
      count,
      fill: CONFIG_COLORS[index % CONFIG_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)

  // Autopilot distribution
  const autopilotCounts: Record<string, number> = {}
  filteredOrders.forEach(order => {
    const autopilot = order.autopilot || 'Kein'
    autopilotCounts[autopilot] = (autopilotCounts[autopilot] || 0) + 1
  })
  const autopilotDistribution = Object.entries(autopilotCounts)
    .map(([name, count], index) => ({
      name,
      count,
      fill: CONFIG_COLORS[index % CONFIG_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)

  // Drive distribution
  const driveCounts: Record<string, number> = {}
  filteredOrders.forEach(order => {
    const drive = order.drive || 'Unbekannt'
    driveCounts[drive] = (driveCounts[drive] || 0) + 1
  })
  const driveDistribution = Object.entries(driveCounts)
    .map(([name, count], index) => ({
      name,
      count,
      fill: CONFIG_COLORS[index % CONFIG_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)

  // Tow hitch (AHK) distribution
  const towHitchCounts: Record<string, number> = {}
  filteredOrders.forEach(order => {
    const towHitch = order.towHitch || 'Unbekannt'
    towHitchCounts[towHitch] = (towHitchCounts[towHitch] || 0) + 1
  })
  const towHitchDistribution = Object.entries(towHitchCounts)
    .map(([name, count], index) => ({
      name,
      count,
      fill: CONFIG_COLORS[index % CONFIG_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)

  // Color (Farbe) distribution - use actual car colors
  const colorCounts: Record<string, number> = {}
  filteredOrders.forEach(order => {
    const color = order.color || 'Unbekannt'
    colorCounts[color] = (colorCounts[color] || 0) + 1
  })
  const colorDistribution = Object.entries(colorCounts)
    .map(([name, count], index) => {
      // Try to find the actual hex color for this car color
      const hex = findColorHex(name)
      return {
        name,
        count,
        fill: hex || CONFIG_COLORS[index % CONFIG_COLORS.length],
      }
    })
    .sort((a, b) => b.count - a.count)

  // Delivery location distribution
  const deliveryLocationCounts: Record<string, number> = {}
  filteredOrders.forEach(order => {
    const location = order.deliveryLocation || 'Unbekannt'
    deliveryLocationCounts[location] = (deliveryLocationCounts[location] || 0) + 1
  })
  const deliveryLocationDistribution = Object.entries(deliveryLocationCounts)
    .map(([name, count], index) => ({
      name,
      count,
      fill: CONFIG_COLORS[index % CONFIG_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)

  return {
    totalOrders,
    deliveredOrders,
    pendingOrders,
    ordersWithoutDate,
    avgOrderToVin,
    avgOrderToDelivery,
    avgOrderToPapers,
    avgPapersToDelivery,
    modelDistribution,
    rangeDistribution,
    countryDistribution,
    ordersOverTime,
    deliveriesOverTime,
    waitTimeDistribution,
    wheelsDistribution,
    interiorDistribution,
    autopilotDistribution,
    driveDistribution,
    towHitchDistribution,
    colorDistribution,
    deliveryLocationDistribution,
  }
}

export function getOrderStatus(order: Order): 'ordered' | 'vin_received' | 'papers_received' | 'delivery_scheduled' | 'delivered' {
  if (order.deliveryDate) {
    // Check if delivery date is in the future
    const parts = order.deliveryDate.split('.')
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number)
      const deliveryDate = new Date(year, month - 1, day)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (deliveryDate > today) {
        return 'delivery_scheduled'
      }
    }
    return 'delivered'
  }
  if (order.papersReceivedDate) return 'papers_received'
  if (order.vinReceivedDate || order.vin) return 'vin_received'
  return 'ordered'
}

export function getStatusProgress(order: Order): number {
  const status = getOrderStatus(order)
  switch (status) {
    case 'ordered': return 25
    case 'vin_received': return 50
    case 'papers_received': return 75
    case 'delivery_scheduled': return 90
    case 'delivered': return 100
  }
}
