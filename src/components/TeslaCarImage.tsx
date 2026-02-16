'use client'

import { memo, useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { COLORS } from '@/lib/types'
import { useCompositorCodes, lookupCode, type CompositorCodeMap } from '@/lib/CompositorCodesContext'

// Hardcoded fallback color codes (used when DB codes not yet loaded)
const FALLBACK_COLOR_CODES: Record<string, string> = {
  'pearl_white': 'PPSW',
  'solid_black': 'PBSB',
  'diamond_black': 'PX02',
  'stealth_grey': 'PN01',
  'quicksilver': 'PN00',
  'ultra_red': 'PR01',
  'glacier_blue': 'PB01',
  'marine_blue': 'PB02',
  'deep_blue': 'PPSB',
  'midnight_cherry': 'PR00',
  'midnight_silver': 'PMNG',
  'red_multi': 'PPMR',
  'silver_metallic': 'PMSS',
}

// Find color code from color value or label
function findColorCode(colorInput: string | null | undefined, vehicleType: string, codes: CompositorCodeMap | null): string | null {
  if (!colorInput) return null

  const normalizedInput = colorInput.toLowerCase().trim().replace(/[\s-]+/g, '_')

  // Try DB codes first
  const dbCode = lookupCode(codes, 'color', vehicleType, normalizedInput)
  if (dbCode) return dbCode

  // Try matching via COLORS array to normalize the value
  const color = COLORS.find(c =>
    c.value === normalizedInput ||
    c.label.toLowerCase().replace(/[\s-]+/g, '_') === normalizedInput ||
    normalizedInput.includes(c.value) ||
    c.value.includes(normalizedInput)
  )

  if (color?.value) {
    const dbCodeFromValue = lookupCode(codes, 'color', vehicleType, color.value)
    if (dbCodeFromValue) return dbCodeFromValue
  }

  // Hardcoded fallback
  if (color?.value && FALLBACK_COLOR_CODES[color.value]) return FALLBACK_COLOR_CODES[color.value]
  if (FALLBACK_COLOR_CODES[normalizedInput]) return FALLBACK_COLOR_CODES[normalizedInput]

  return null
}

// Extract wheel size number from value or label
function findWheelSize(wheelInput: string | null | undefined): string | null {
  if (!wheelInput) return null
  const match = wheelInput.match(/(\d{2})/)
  return match ? match[1] : null
}

// Resolve body code from model (trim) + drive
function resolveBodyCode(
  vehicleType: string,
  model: string | null | undefined,
  drive: string | null | undefined,
  codes: CompositorCodeMap | null
): string | null {
  if (!model) return null
  const trimNorm = model.toLowerCase().trim()

  // Performance has no drive suffix
  if (trimNorm === 'performance') {
    return lookupCode(codes, 'body', vehicleType, 'performance')
  }

  // Build lookup key: trim_drive (e.g. "standard_rwd", "premium_awd")
  const driveNorm = drive?.toLowerCase().trim() || 'rwd'
  const key = `${trimNorm}_${driveNorm}`
  return lookupCode(codes, 'body', vehicleType, key)
}

// Resolve wheel code from size + trim context
function resolveWheelCode(
  vehicleType: string,
  wheels: string | null | undefined,
  model: string | null | undefined,
  codes: CompositorCodeMap | null
): string | null {
  const wheelSize = findWheelSize(wheels)
  if (!wheelSize) return null

  // Model 3 has trim-specific wheel codes for 18"
  if (vehicleType === 'Model 3' && wheelSize === '18') {
    const trimNorm = model?.toLowerCase().trim() || 'standard'
    if (trimNorm === 'standard') {
      return lookupCode(codes, 'wheel', vehicleType, '18_standard')
    }
    return lookupCode(codes, 'wheel', vehicleType, '18_premium')
  }

  return lookupCode(codes, 'wheel', vehicleType, wheelSize)
}

// Resolve interior code from trim + interior color
function resolveInteriorCode(
  vehicleType: string,
  model: string | null | undefined,
  interior: string | null | undefined,
  drive: string | null | undefined,
  codes: CompositorCodeMap | null
): string | null {
  if (!model) return null
  const trimNorm = model.toLowerCase().trim()
  const interiorNorm = interior?.toLowerCase().trim() || 'black'

  // Model 3 Premium AWD has its own interior codes
  if (vehicleType === 'Model 3' && trimNorm === 'premium') {
    const driveNorm = drive?.toLowerCase().trim()
    if (driveNorm === 'awd') {
      return lookupCode(codes, 'interior', vehicleType, `premium_awd_${interiorNorm}`)
    }
  }

  const key = `${trimNorm}_${interiorNorm}`
  return lookupCode(codes, 'interior', vehicleType, key)
}

type ViewAngle = 'STUD_3QTR' | 'STUD_SIDE' | 'STUD_REAR' | 'STUD_FRONT'

interface TeslaCarImageProps {
  vehicleType: 'Model Y' | 'Model 3'
  color?: string | null
  wheels?: string | null
  model?: string | null
  drive?: string | null
  interior?: string | null
  view?: ViewAngle
  size?: number
  fetchSize?: number
  className?: string
}

function buildOptionsString(
  vehicleType: 'Model Y' | 'Model 3',
  color: string | null | undefined,
  wheels: string | null | undefined,
  model: string | null | undefined,
  drive: string | null | undefined,
  interior: string | null | undefined,
  codes: CompositorCodeMap | null
): string {
  const options: string[] = []

  const bodyCode = resolveBodyCode(vehicleType, model, drive, codes)
  if (bodyCode) options.push(`$${bodyCode}`)

  const colorCode = findColorCode(color, vehicleType, codes)
  options.push(`$${colorCode || 'PPSW'}`)

  const wheelCode = resolveWheelCode(vehicleType, wheels, model, codes)
  if (wheelCode) options.push(`$${wheelCode}`)

  const interiorCode = resolveInteriorCode(vehicleType, model, interior, drive, codes)
  if (interiorCode) options.push(`$${interiorCode}`)

  return options.join(',')
}

function buildTeslaUrl(modelSlug: string, optionsStr: string, view: string, size: number): string {
  const params = new URLSearchParams({
    bkba_opt: '2',
    model: modelSlug,
    options: optionsStr,
    size: size.toString(),
    view,
  })
  return `https://static-assets.tesla.com/configurator/compositor?${params.toString()}`
}

function buildCacheUrl(modelSlug: string, optionsStr: string, view: string, size: number): string {
  const params = new URLSearchParams({
    model: modelSlug,
    options: optionsStr,
    size: size.toString(),
    view,
  })
  return `/api/compositor-image?${params.toString()}`
}

// Upload image to server cache via canvas capture
function uploadToCache(img: HTMLImageElement, cacheUrl: string) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob || blob.size < 1024) return
      // Fire-and-forget upload
      fetch(cacheUrl, {
        method: 'POST',
        body: blob,
      }).catch(() => {}) // silently ignore upload failures
    }, 'image/png')
  } catch {
    // Canvas tainted or other error — ignore
  }
}

// Track which cache URLs have been checked to avoid repeated 404s
const cacheChecked = new Set<string>()

// Loading stages:
// 1. 'cache' — try our server cache
// 2. 'tesla-cors' — load from Tesla CDN with crossOrigin (enables canvas capture)
// 3. 'tesla-direct' — load from Tesla CDN without crossOrigin (fallback if CORS blocked)
type LoadStage = 'cache' | 'tesla-cors' | 'tesla-direct'

export const TeslaCarImage = memo(function TeslaCarImage({
  vehicleType,
  color,
  wheels,
  model,
  drive,
  interior,
  view = 'STUD_3QTR',
  size = 400,
  fetchSize,
  className,
}: TeslaCarImageProps) {
  const codes = useCompositorCodes()
  const imgRef = useRef<HTMLImageElement>(null)

  const modelSlug = vehicleType === 'Model Y' ? 'my' : 'm3'
  const apiSize = fetchSize || size
  const optionsStr = buildOptionsString(vehicleType, color, wheels, model, drive, interior, codes)
  const cacheUrl = buildCacheUrl(modelSlug, optionsStr, view, apiSize)
  const teslaUrl = buildTeslaUrl(modelSlug, optionsStr, view, apiSize)

  // Skip cache stage if we already know it's a miss
  const initialStage: LoadStage = cacheChecked.has(cacheUrl) ? 'tesla-cors' : 'cache'
  const [stage, setStage] = useState<LoadStage>(initialStage)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    // If loaded from Tesla with CORS, try to capture and upload to our cache
    if (stage === 'tesla-cors' && imgRef.current) {
      uploadToCache(imgRef.current, cacheUrl)
    }
  }, [stage, cacheUrl])

  const handleError = useCallback(() => {
    if (stage === 'cache') {
      // Cache miss — remember and try Tesla with CORS
      cacheChecked.add(cacheUrl)
      setStage('tesla-cors')
    } else if (stage === 'tesla-cors') {
      // CORS blocked — fall back to direct loading (no cache upload possible)
      setStage('tesla-direct')
    } else {
      // All stages failed
      setHasError(true)
      setIsLoading(false)
    }
  }, [stage, cacheUrl])

  // Determine current src and crossOrigin based on stage
  let imgSrc: string
  let crossOrigin: '' | 'anonymous' | undefined
  if (stage === 'cache') {
    imgSrc = cacheUrl
    crossOrigin = undefined
  } else if (stage === 'tesla-cors') {
    imgSrc = teslaUrl
    crossOrigin = 'anonymous'
  } else {
    imgSrc = teslaUrl
    crossOrigin = undefined
  }

  // Collect missing fields for debug display in error fallback
  const missing: string[] = []
  if (!color) missing.push('Farbe')
  if (!wheels) missing.push('Felgen')
  if (!model) missing.push('Modell')
  if (!drive) missing.push('Antrieb')
  if (!interior) missing.push('Interieur')

  if (hasError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 bg-muted rounded-lg text-muted-foreground",
          className
        )}
        style={{ width: size, height: size * 0.5 }}
      >
        <span className="text-sm font-medium">{vehicleType}</span>
        {missing.length > 0 && (
          <span className="text-[10px] opacity-70">Fehlt: {missing.join(', ')}</span>
        )}
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
        ref={imgRef}
        key={`${stage}-${imgSrc}`}
        src={imgSrc}
        crossOrigin={crossOrigin}
        alt={`${vehicleType} - ${color || 'default'} with ${wheels || 'default'}" wheels`}
        className={cn(
          "object-contain",
          isLoading && "opacity-0"
        )}
        style={{ width: size, height: 'auto', maxHeight: size * 0.6 }}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  )
})

// Compact version for cards
export const TeslaCarThumbnail = memo(function TeslaCarThumbnail({
  vehicleType,
  color,
  wheels,
  model,
  drive,
  interior,
  className,
}: Omit<TeslaCarImageProps, 'view' | 'size' | 'fetchSize'>) {
  return (
    <TeslaCarImage
      vehicleType={vehicleType}
      color={color}
      wheels={wheels}
      model={model}
      drive={drive}
      interior={interior}
      view="STUD_3QTR"
      size={200}
      fetchSize={800}
      className={className}
    />
  )
})
