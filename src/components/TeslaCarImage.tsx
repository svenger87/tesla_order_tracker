'use client'

import { memo, useState } from 'react'
import { cn } from '@/lib/utils'
import { COLORS } from '@/lib/types'

// Tesla compositor base URL - using configurator/compositor endpoint
const COMPOSITOR_BASE = 'https://static-assets.tesla.com/configurator/compositor'

// Color value to Tesla compositor option code mapping
// Source: tesla-order-status-tracker.de (2026-02-07) + POC verification
const COLOR_CODES: Record<string, string> = {
  // Current colors (2025 Model Y Juniper / Model 3 Highland)
  'pearl_white': 'PPSW',
  'solid_black': 'PBSB',
  'diamond_black': 'PX02',      // Updated for Juniper
  'stealth_grey': 'PN01',
  'quicksilver': 'PN00',
  'ultra_red': 'PR01',
  'glacier_blue': 'PB01',       // New Juniper color
  'marine_blue': 'PB02',        // New Juniper color (updated code)
  'deep_blue': 'PPSB',
  'midnight_cherry': 'PR00',
  // Legacy colors (discontinued but appear in historical orders)
  'midnight_silver': 'PMNG',
  'red_multi': 'PPMR',
  'silver_metallic': 'PMSS',
  'obsidian_black': 'PMBL',     // Old Model Y
  'anza_brown': 'PMAB',
  'monterey_blue': 'PMMB',
  'green_metallic': 'PMSG',
  'dolphin_grey': 'PMTG',
  'signature_red': 'PPSR',
  'titanium': 'PPTI',
  'solid_white': 'PBCW',
}

// Find color code from color value or label
function findColorCode(colorInput: string | null | undefined): string | null {
  if (!colorInput) return null

  const normalizedInput = colorInput.toLowerCase().trim().replace(/[\s-]+/g, '_')

  // Direct match on value
  if (COLOR_CODES[normalizedInput]) {
    return COLOR_CODES[normalizedInput]
  }

  // Try to match via COLORS array (value or label)
  const color = COLORS.find(c =>
    c.value === normalizedInput ||
    c.label.toLowerCase().replace(/[\s-]+/g, '_') === normalizedInput ||
    normalizedInput.includes(c.value) ||
    c.value.includes(normalizedInput)
  )

  if (color?.value && COLOR_CODES[color.value]) {
    return COLOR_CODES[color.value]
  }

  return null
}

// Extract wheel size number from value or label (e.g., "19" from '19"' or '19')
function findWheelSize(wheelInput: string | null | undefined): string | null {
  if (!wheelInput) return null

  // Extract just the number portion
  const match = wheelInput.match(/(\d{2})/)
  return match ? match[1] : null
}

// Model Y wheel codes (2025 Juniper + legacy)
// Source: tesla-order-status-tracker.de + POC verification
const MODEL_Y_WHEEL_CODES: Record<string, string> = {
  '18': 'WY18B',    // 18" Aero
  '19': 'WY19B',    // 19" Sport (pre-Juniper: Gemini)
  '20': 'WY20A',    // 20" Helix (Juniper) - updated from WY0S
  '21': 'WY21A',    // 21" Arachnid 2.0 (Juniper) - updated from WY1S
}

// Model 3 wheel codes (Highland 2024+)
// Source: tesla-order-status-tracker.de + POC verification
const MODEL_3_WHEEL_CODES: Record<string, string> = {
  '18': 'W38A',     // 18" Photon (Highland default) - updated from W38B
  '19': 'W39B',     // 19" Sport
  '20': 'W32P',     // 20" Performance
}

// View angles
type ViewAngle = 'STUD_3QTR' | 'STUD_SIDE' | 'STUD_REAR' | 'STUD_FRONT'

interface TeslaCarImageProps {
  vehicleType: 'Model Y' | 'Model 3'
  color?: string | null
  wheels?: string | null
  view?: ViewAngle
  size?: number // Display size in CSS pixels
  fetchSize?: number // Resolution to request from API (for high-DPI screens)
  className?: string
}

// Body style / generation codes for current models
// Source: POC testing (2026-02-12) - verified with Tesla compositor API
// Model 3: Default (no code) = Highland body
// Model Y: MTY70 = Juniper body (without this, shows pre-Juniper)
const MODEL_Y_JUNIPER_CODE = 'MTY70'

function buildCompositorUrl(
  vehicleType: 'Model Y' | 'Model 3',
  color: string | null | undefined,
  wheels: string | null | undefined,
  view: ViewAngle,
  size: number
): string {
  const model = vehicleType === 'Model Y' ? 'my' : 'm3'
  const wheelCodes = vehicleType === 'Model Y' ? MODEL_Y_WHEEL_CODES : MODEL_3_WHEEL_CODES

  // Build options array
  const options: string[] = []

  // Add color code - resolve from value or label
  const colorCode = findColorCode(color)
  if (colorCode) {
    options.push(`$${colorCode}`)
  } else {
    // Default to Pearl White
    options.push('$PPSW')
  }

  // Add wheel code - extract wheel size from value or label
  const wheelSize = findWheelSize(wheels)
  if (wheelSize && wheelCodes[wheelSize]) {
    options.push(`$${wheelCodes[wheelSize]}`)
  } else {
    // Default to base wheels (Juniper/Highland defaults)
    options.push(vehicleType === 'Model Y' ? '$WY19B' : '$W38A')
  }

  // Add body style code for Juniper Model Y
  // Model 3 Highland is default (no additional code needed)
  if (vehicleType === 'Model Y') {
    options.push(`$${MODEL_Y_JUNIPER_CODE}`)
  }

  const params = new URLSearchParams({
    bkba_opt: '2',  // Transparent background (using value 2 as per teslahunt library)
    model,
    options: options.join(','),
    size: size.toString(),
    view,
  })

  return `${COMPOSITOR_BASE}?${params.toString()}`
}

export const TeslaCarImage = memo(function TeslaCarImage({
  vehicleType,
  color,
  wheels,
  view = 'STUD_3QTR',
  size = 400,
  fetchSize,
  className,
}: TeslaCarImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Use fetchSize if provided, otherwise use size (for backwards compatibility)
  // For high-DPI screens, request a larger image than display size
  const apiSize = fetchSize || size
  const imageUrl = buildCompositorUrl(vehicleType, color, wheels, view, apiSize)

  if (hasError) {
    // Fallback: show a placeholder or text
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded-lg text-muted-foreground text-sm",
          className
        )}
        style={{ width: size, height: size * 0.5 }}
      >
        {vehicleType}
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg"
          style={{ width: size, height: size * 0.5 }}
        >
          <div className="animate-pulse text-muted-foreground text-xs">Loading...</div>
        </div>
      )}
      <img
        src={imageUrl}
        alt={`${vehicleType} - ${color || 'default'} with ${wheels || 'default'}" wheels`}
        className={cn(
          "object-contain",
          isLoading && "opacity-0"
        )}
        style={{ width: size, height: 'auto', maxHeight: size * 0.6 }}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true)
          setIsLoading(false)
        }}
        loading="lazy"
      />
    </div>
  )
})

// Compact version for cards - requests high-res image for crisp display on retina screens
export const TeslaCarThumbnail = memo(function TeslaCarThumbnail({
  vehicleType,
  color,
  wheels,
  className,
}: Omit<TeslaCarImageProps, 'view' | 'size' | 'fetchSize'>) {
  return (
    <TeslaCarImage
      vehicleType={vehicleType}
      color={color}
      wheels={wheels}
      view="STUD_3QTR"
      size={200} // Display size
      fetchSize={800} // Request 800px for high-DPI screens (4x)
      className={className}
    />
  )
})
