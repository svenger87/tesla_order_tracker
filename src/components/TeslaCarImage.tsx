'use client'

import { memo, useState } from 'react'
import { cn } from '@/lib/utils'
import { COLORS } from '@/lib/types'

// Tesla compositor base URL
const COMPOSITOR_BASE = 'https://static-assets.tesla.com/v1/compositor/'

// Color value to Tesla option code mapping
const COLOR_CODES: Record<string, string> = {
  // Current colors (2024-2025)
  'pearl_white': 'PPSW',
  'diamond_black': 'PMBL',      // Obsidian Black Multi-Coat (closest match)
  'stealth_grey': 'PN01',
  'quicksilver': 'PN00',
  'ultra_red': 'PR01',
  'marine_blue': 'PPSB',        // Deep Blue Metallic (closest match)
  // Legacy colors
  'midnight_silver': 'PMNG',
  'solid_black': 'PBSB',
  'deep_blue': 'PPSB',
  'red_multi': 'PPMR',
  'midnight_cherry': 'PR00',
  'silver_metallic': 'PMSS',
}

// Find color value from either value or label
function findColorValue(colorInput: string | null | undefined): string | null {
  if (!colorInput) return null

  // First check if it's already a valid value
  if (COLOR_CODES[colorInput]) {
    return colorInput
  }

  // Otherwise try to find by label (case-insensitive)
  const normalizedInput = colorInput.toLowerCase().trim()
  const color = COLORS.find(c =>
    c.value === normalizedInput ||
    c.label.toLowerCase() === normalizedInput ||
    normalizedInput.includes(c.label.toLowerCase()) ||
    c.label.toLowerCase().includes(normalizedInput)
  )

  return color?.value || null
}

// Extract wheel size number from value or label (e.g., "19" from '19"' or '19')
function findWheelSize(wheelInput: string | null | undefined): string | null {
  if (!wheelInput) return null

  // Extract just the number portion
  const match = wheelInput.match(/(\d{2})/)
  return match ? match[1] : null
}

// Model Y wheel codes
const MODEL_Y_WHEEL_CODES: Record<string, string> = {
  '18': 'WY18B',    // 18" Aero
  '19': 'WY19B',    // 19" Gemini
  '20': 'WY0S',     // 20" Induction
  '21': 'WY1S',     // 21" Uberturbine
}

// Model 3 wheel codes (Highland 2024+)
const MODEL_3_WHEEL_CODES: Record<string, string> = {
  '18': 'W38B',     // 18" Aero
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
  const colorValue = findColorValue(color)
  if (colorValue && COLOR_CODES[colorValue]) {
    options.push(`$${COLOR_CODES[colorValue]}`)
  } else {
    // Default to Pearl White
    options.push('$PPSW')
  }

  // Add wheel code - extract wheel size from value or label
  const wheelSize = findWheelSize(wheels)
  if (wheelSize && wheelCodes[wheelSize]) {
    options.push(`$${wheelCodes[wheelSize]}`)
  } else {
    // Default to base wheels
    options.push(vehicleType === 'Model Y' ? '$WY19B' : '$W38B')
  }

  const params = new URLSearchParams({
    model,
    view,
    size: size.toString(),
    options: options.join(','),
    bkba_opt: '1',  // Transparent background
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
