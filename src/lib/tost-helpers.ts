import { parse, differenceInDays, isValid } from 'date-fns'

// Helper to parse German date format (DD.MM.YYYY)
export function parseGermanDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const parsed = parse(dateStr, 'dd.MM.yyyy', new Date())
  return isValid(parsed) ? parsed : null
}

export function calculateDaysBetween(
  fromDate: string | null | undefined,
  toDate: string | null | undefined
): number | null {
  const from = parseGermanDate(fromDate)
  const to = parseGermanDate(toDate)
  if (!from || !to) return null
  return differenceInDays(to, from)
}

export function calculateTimePeriods(data: {
  orderDate?: string | null
  productionDate?: string | null
  vinReceivedDate?: string | null
  deliveryDate?: string | null
  papersReceivedDate?: string | null
}) {
  return {
    orderToProduction: calculateDaysBetween(data.orderDate, data.productionDate),
    orderToVin: calculateDaysBetween(data.orderDate, data.vinReceivedDate),
    orderToDelivery: calculateDaysBetween(data.orderDate, data.deliveryDate),
    orderToPapers: calculateDaysBetween(data.orderDate, data.papersReceivedDate),
    papersToDelivery: calculateDaysBetween(data.papersReceivedDate, data.deliveryDate),
  }
}

// Fields to select for API responses (excludes editCode for security)
export const orderSelectFields = {
  id: true,
  name: true,
  vehicleType: true,
  orderDate: true,
  country: true,
  model: true,
  range: true,
  drive: true,
  color: true,
  interior: true,
  wheels: true,
  towHitch: true,
  autopilot: true,
  seats: true,
  source: true,
  tostUserId: true,
  deliveryWindow: true,
  deliveryLocation: true,
  vin: true,
  vinReceivedDate: true,
  papersReceivedDate: true,
  productionDate: true,
  typeApproval: true,
  typeVariant: true,
  deliveryDate: true,
  orderToProduction: true,
  orderToVin: true,
  orderToDelivery: true,
  orderToPapers: true,
  papersToDelivery: true,
  archived: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const
