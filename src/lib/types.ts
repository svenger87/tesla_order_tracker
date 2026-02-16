// Vehicle types supported by the application
export type VehicleType = 'Model Y' | 'Model 3'

export const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'Model Y', label: 'Model Y' },
  { value: 'Model 3', label: 'Model 3' },
]

export interface Order {
  id: string
  name: string
  vehicleType: string
  orderDate: string | null
  country: string | null
  model: string | null
  range: string | null  // Reichweite - null for Performance models
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
  updatedAt?: string
}

export interface OrderFormData {
  name: string
  vehicleType: VehicleType
  orderDate: string
  country: string
  model: string
  range: string  // Reichweite
  drive: string
  color: string
  interior: string
  wheels: string
  towHitch: string
  autopilot: string
  deliveryWindow: string
  deliveryLocation: string
  vin: string
  vinReceivedDate: string
  papersReceivedDate: string
  productionDate: string
  typeApproval: string
  typeVariant: string
  deliveryDate: string
  // Password options for edit code
  useCustomPassword: boolean
  customPassword: string
  confirmPassword: string
}

// Validation helper for custom passwords — returns error key for i18n
export function validateCustomPassword(password: string): { valid: boolean; errorKey?: string } {
  if (password.length < 6) {
    return { valid: false, errorKey: 'passwordMinLength' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, errorKey: 'passwordNeedsNumber' }
  }
  return { valid: true }
}

export interface Settings {
  id: string
  showDonation: boolean
  donationUrl: string
  donationText: string
  lastSyncTime: string | null
  lastSyncCount: number | null
  archiveEnabled: boolean
  archiveThreshold: number
}

export interface SyncResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

// All EU countries + Switzerland, UK, Norway - sorted alphabetically by German label
export const COUNTRIES = [
  { value: 'be', label: 'Belgien', flag: '🇧🇪' },
  { value: 'bg', label: 'Bulgarien', flag: '🇧🇬' },
  { value: 'dk', label: 'Dänemark', flag: '🇩🇰' },
  { value: 'de', label: 'Deutschland', flag: '🇩🇪' },
  { value: 'ee', label: 'Estland', flag: '🇪🇪' },
  { value: 'fi', label: 'Finnland', flag: '🇫🇮' },
  { value: 'fr', label: 'Frankreich', flag: '🇫🇷' },
  { value: 'gr', label: 'Griechenland', flag: '🇬🇷' },
  { value: 'ie', label: 'Irland', flag: '🇮🇪' },
  { value: 'it', label: 'Italien', flag: '🇮🇹' },
  { value: 'hr', label: 'Kroatien', flag: '🇭🇷' },
  { value: 'lv', label: 'Lettland', flag: '🇱🇻' },
  { value: 'lt', label: 'Litauen', flag: '🇱🇹' },
  { value: 'lu', label: 'Luxemburg', flag: '🇱🇺' },
  { value: 'mt', label: 'Malta', flag: '🇲🇹' },
  { value: 'nl', label: 'Niederlande', flag: '🇳🇱' },
  { value: 'no', label: 'Norwegen', flag: '🇳🇴' },
  { value: 'at', label: 'Österreich', flag: '🇦🇹' },
  { value: 'pl', label: 'Polen', flag: '🇵🇱' },
  { value: 'pt', label: 'Portugal', flag: '🇵🇹' },
  { value: 'ro', label: 'Rumänien', flag: '🇷🇴' },
  { value: 'se', label: 'Schweden', flag: '🇸🇪' },
  { value: 'ch', label: 'Schweiz', flag: '🇨🇭' },
  { value: 'sk', label: 'Slowakei', flag: '🇸🇰' },
  { value: 'si', label: 'Slowenien', flag: '🇸🇮' },
  { value: 'es', label: 'Spanien', flag: '🇪🇸' },
  { value: 'cz', label: 'Tschechien', flag: '🇨🇿' },
  { value: 'uk', label: 'UK', flag: '🇬🇧' },
  { value: 'hu', label: 'Ungarn', flag: '🇭🇺' },
  { value: 'cy', label: 'Zypern', flag: '🇨🇾' },
]

// Model Y trims
export const MODELS = [
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'performance', label: 'Performance' },
]

// Alias for clarity
export const MODEL_Y_TRIMS = MODELS

// Model 3 trims (same structure as Model Y)
export const MODEL_3_TRIMS = [
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'performance', label: 'Performance' },
]

export const RANGES = [
  { value: 'maximale_reichweite', label: 'Maximale Reichweite' },
  { value: 'standard', label: 'Standard' },
]

export const DRIVES = [
  { value: 'rwd', label: 'RWD' },
  { value: 'awd', label: 'AWD' },
]

export const COLORS = [
  // Current colors (2025 Model Y Juniper / Model 3 Highland)
  { value: 'pearl_white', label: 'Pearl White', hex: '#FFFFFF', border: true },
  { value: 'solid_black', label: 'Solid Black', hex: '#000000', border: false },
  { value: 'diamond_black', label: 'Diamond Black', hex: '#1A1A1A', border: false },
  { value: 'stealth_grey', label: 'Stealth Grey', hex: '#4A4A4A', border: false },
  { value: 'quicksilver', label: 'Quicksilver', hex: '#C0C0C0', border: true },
  { value: 'ultra_red', label: 'Ultra Red', hex: '#C41E3A', border: false },
  { value: 'glacier_blue', label: 'Glacier Blue', hex: '#8FBBD9', border: false },  // New Juniper
  { value: 'marine_blue', label: 'Marine Blue', hex: '#1E3A5F', border: false },    // New Juniper
  { value: 'deep_blue', label: 'Deep Blue Metallic', hex: '#1C3A5F', border: false },
  { value: 'midnight_cherry', label: 'Midnight Cherry Red', hex: '#5C0029', border: false },
  // Legacy colors (discontinued but appear in historical orders)
  { value: 'midnight_silver', label: 'Midnight Silver Metallic', hex: '#71797E', border: false },
  { value: 'red_multi', label: 'Red Multi-Coat', hex: '#A52125', border: false },
  { value: 'silver_metallic', label: 'Silver Metallic', hex: '#A8A9AD', border: true },
]

export const INTERIORS = [
  { value: 'black', label: 'Schwarz' },
  { value: 'white', label: 'Weiß' },
]

// Model Y wheels (all sizes)
export const WHEELS = [
  { value: '18', label: "18\"" },
  { value: '19', label: "19\"" },
  { value: '20', label: "20\"" },
  { value: '21', label: "21\"" },
]

// Alias for clarity
export const MODEL_Y_WHEELS = WHEELS

// Model 3 wheels
export const MODEL_3_WHEELS = [
  { value: '18', label: '18"' },
  { value: '19', label: '19"' },
  { value: '20', label: '20"' },
]

// Model 3 wheel constraints per trim
export const MODEL_3_WHEEL_CONSTRAINTS: Record<string, string[]> = {
  'standard': ['18'],
  'premium': ['18', '19'],
  'performance': ['20'],
}

// Model 3 color constraints per trim
export const MODEL_3_COLOR_CONSTRAINTS: Record<string, string[]> = {
  'standard': ['pearl_white', 'diamond_black', 'stealth_grey'],
  'premium': ['pearl_white', 'diamond_black', 'stealth_grey', 'marine_blue', 'ultra_red', 'quicksilver'],
  'performance': ['pearl_white', 'diamond_black', 'stealth_grey', 'marine_blue', 'ultra_red', 'quicksilver'],
}

// Model 3 interior constraints per trim
export const MODEL_3_INTERIOR_CONSTRAINTS: Record<string, string[]> = {
  'standard': ['black'],
  'premium': ['black', 'white'],
  'performance': ['black', 'white'],
}

// Model 3 tow hitch availability per trim
export const MODEL_3_TOW_HITCH_AVAILABLE: Record<string, boolean> = {
  'standard': true,
  'premium': true,
  'performance': false,
}

export const AUTOPILOT_OPTIONS = [
  { value: 'none', label: 'Kein' },
  { value: 'ap', label: 'AP' },
  { value: 'eap', label: 'EAP' },
  { value: 'eap_transfer', label: 'EAP Transfer' },
  { value: 'fsd', label: 'FSD' },
  { value: 'fsd_transfer', label: 'FSD Transfer' },
]

export const TOW_HITCH_OPTIONS = [
  { value: 'ja', label: 'Ja' },
  { value: 'nein', label: 'Nein' },
  { value: 'nv', label: 'n.v.' },  // nicht verfügbar - for models without AHK option
]
