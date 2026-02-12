// API Order type (excludes sensitive fields like editCode)
export interface ApiOrder {
  id: string
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

// Create order request body
export interface CreateOrderRequest {
  name: string
  vehicleType?: string  // "Model Y" or "Model 3", defaults to "Model Y"
  orderDate?: string
  country?: string
  model?: string
  range?: string
  drive?: string
  color?: string
  interior?: string
  wheels?: string
  towHitch?: string
  autopilot?: string
  deliveryWindow?: string
  deliveryLocation?: string
  vin?: string
  vinReceivedDate?: string
  papersReceivedDate?: string
  productionDate?: string
  typeApproval?: string
  typeVariant?: string
  deliveryDate?: string
  editCode?: string // Optional custom edit code
}

// Update order request body
export interface UpdateOrderRequest {
  editCode: string // Required for authorization
  name?: string
  vehicleType?: string  // "Model Y" or "Model 3"
  orderDate?: string
  country?: string
  model?: string
  range?: string
  drive?: string
  color?: string
  interior?: string
  wheels?: string
  towHitch?: string
  autopilot?: string
  deliveryWindow?: string
  deliveryLocation?: string
  vin?: string
  vinReceivedDate?: string
  papersReceivedDate?: string
  productionDate?: string
  typeApproval?: string
  typeVariant?: string
  deliveryDate?: string
  expectedUpdatedAt?: string // For optimistic locking
}

// Single option item
export interface ApiOption {
  value: string
  label: string
  vehicleType?: string | null  // null = applies to all vehicles
  metadata?: Record<string, unknown>
}

// Options grouped by type
export interface ApiOptions {
  country: ApiOption[]
  model: ApiOption[]
  range: ApiOption[]
  drive: ApiOption[]
  color: ApiOption[]
  interior: ApiOption[]
  wheels: ApiOption[]
  autopilot: ApiOption[]
  towHitch: ApiOption[]
  deliveryLocation: ApiOption[]
}

// Pagination parameters
export interface PaginationParams {
  limit: number
  offset: number
}

// Order filter parameters
export interface OrderFilterParams extends PaginationParams {
  vehicleType?: string  // "Model Y" or "Model 3"
  country?: string
  model?: string
  archived?: boolean
}

// API response for order creation
export interface CreateOrderResponse {
  id: string
  editCode: string | null
  message: string
}

// API response for order update
export interface UpdateOrderResponse {
  id: string
  updatedAt: string
  message: string
}
