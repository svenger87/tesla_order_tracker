import { toBool } from './db'

// Column list for public-facing order queries (excludes editCode, resetCode, resetCodeExpires)
export const ORDER_PUBLIC_COLS = `id, name, vehicleType, orderDate, country, model, range, drive, color, interior, wheels, towHitch, autopilot, deliveryWindow, deliveryLocation, vin, vinReceivedDate, papersReceivedDate, productionDate, typeApproval, typeVariant, deliveryDate, orderToProduction, orderToVin, orderToDelivery, orderToPapers, papersToDelivery, archived, archivedAt, createdAt, updatedAt`

// ── Row types ────────────────────────────────────────────────────────

export interface OrderRow {
  id: string
  editCode: string | null
  resetCode: string | null
  resetCodeExpires: string | null
  name: string
  vehicleType: string
  orderDate: string | null
  country: string | null
  model: string | null
  range: string | null
  drive: string | null
  color: string | null
  interior: string | null
  wheels: string | null
  towHitch: string | null
  autopilot: string | null
  deliveryWindow: string | null
  deliveryLocation: string | null
  vin: string | null
  vinReceivedDate: string | null
  papersReceivedDate: string | null
  productionDate: string | null
  typeApproval: string | null
  typeVariant: string | null
  deliveryDate: string | null
  orderToProduction: number | null
  orderToVin: number | null
  orderToDelivery: number | null
  orderToPapers: number | null
  papersToDelivery: number | null
  archived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminRow {
  id: string
  username: string
  passwordHash: string
  resetToken: string | null
  resetTokenExpires: string | null
  createdAt: string
  updatedAt: string
}

export interface SettingsRow {
  id: string
  showDonation: boolean
  donationUrl: string
  donationText: string
  lastSyncTime: string | null
  lastSyncCount: number | null
  archiveEnabled: boolean
  archiveThreshold: number
  updatedAt: string
}

export interface OptionRow {
  id: string
  type: string
  value: string
  label: string
  metadata: string | null
  vehicleType: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ConstraintRow {
  id: string
  sourceType: string
  sourceValue: string
  vehicleType: string | null
  targetType: string
  constraintType: string
  values: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ── Transform functions ──────────────────────────────────────────────
// SQLite returns booleans as 0/1 — these convert them to proper booleans.

export function transformOrderRow(row: Record<string, unknown>): OrderRow {
  return {
    ...row,
    archived: toBool(row.archived),
  } as OrderRow
}

export function transformSettingsRow(row: Record<string, unknown>): SettingsRow {
  return {
    ...row,
    showDonation: toBool(row.showDonation),
    archiveEnabled: toBool(row.archiveEnabled),
  } as SettingsRow
}

export function transformOptionRow(row: Record<string, unknown>): OptionRow {
  return {
    ...row,
    isActive: toBool(row.isActive),
  } as OptionRow
}

export function transformConstraintRow(row: Record<string, unknown>): ConstraintRow {
  return {
    ...row,
    isActive: toBool(row.isActive),
  } as ConstraintRow
}
