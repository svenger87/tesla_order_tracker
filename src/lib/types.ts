export interface Order {
  id: string
  name: string
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

// Validation helper for custom passwords
export function validateCustomPassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) {
    return { valid: false, error: 'Passwort muss mindestens 6 Zeichen lang sein' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Passwort muss mindestens eine Zahl enthalten' }
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

export const COUNTRIES = [
  { value: 'de', label: 'Deutschland', flag: '🇩🇪' },
  { value: 'at', label: 'Österreich', flag: '🇦🇹' },
  { value: 'ch', label: 'Schweiz', flag: '🇨🇭' },
  { value: 'nl', label: 'Niederlande', flag: '🇳🇱' },
  { value: 'be', label: 'Belgien', flag: '🇧🇪' },
  { value: 'fr', label: 'Frankreich', flag: '🇫🇷' },
  { value: 'it', label: 'Italien', flag: '🇮🇹' },
  { value: 'es', label: 'Spanien', flag: '🇪🇸' },
  { value: 'pt', label: 'Portugal', flag: '🇵🇹' },
  { value: 'pl', label: 'Polen', flag: '🇵🇱' },
  { value: 'uk', label: 'UK', flag: '🇬🇧' },
]

export const MODELS = [
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
  // Current colors (2025)
  { value: 'pearl_white', label: 'Pearl White', hex: '#FFFFFF', border: true },
  { value: 'diamond_black', label: 'Diamond Black', hex: '#1A1A1A', border: false },
  { value: 'stealth_grey', label: 'Stealth Grey', hex: '#4A4A4A', border: false },
  { value: 'quicksilver', label: 'Quicksilver', hex: '#C0C0C0', border: true },
  { value: 'ultra_red', label: 'Ultra Red', hex: '#C41E3A', border: false },
  { value: 'marine_blue', label: 'Marine Blue', hex: '#1E3A5F', border: false },
  // Legacy colors (discontinued but appear in historical orders)
  { value: 'midnight_silver', label: 'Midnight Silver Metallic', hex: '#71797E', border: false },
  { value: 'solid_black', label: 'Solid Black', hex: '#000000', border: false },
  { value: 'deep_blue', label: 'Deep Blue Metallic', hex: '#1C3A5F', border: false },
  { value: 'red_multi', label: 'Red Multi-Coat', hex: '#A52125', border: false },
  { value: 'midnight_cherry', label: 'Midnight Cherry Red', hex: '#5C0029', border: false },
  { value: 'silver_metallic', label: 'Silver Metallic', hex: '#A8A9AD', border: true },
]

export const INTERIORS = [
  { value: 'black', label: 'Schwarz' },
  { value: 'white', label: 'Weiß' },
]

export const WHEELS = [
  { value: '18', label: "18\"" },
  { value: '19', label: "19\"" },
  { value: '20', label: "20\"" },
  { value: '21', label: "21\"" },
]

export const AUTOPILOT_OPTIONS = [
  { value: 'none', label: 'Kein' },
  { value: 'ap', label: 'AP' },
  { value: 'eap', label: 'EAP' },
  { value: 'fsd', label: 'FSD' },
  { value: 'fsd_transfer', label: 'FSD Transfer' },
]

export const TOW_HITCH_OPTIONS = [
  { value: 'ja', label: 'Ja' },
  { value: 'nein', label: 'Nein' },
]
