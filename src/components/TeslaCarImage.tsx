'use client'

import { memo, useState, useEffect, useRef } from 'react'
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

  if (trimNorm === 'performance') {
    return lookupCode(codes, 'body', vehicleType, 'performance')
  }

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

  if (vehicleType === 'Model 3' && wheelSize === '18') {
    const trimNorm = model?.toLowerCase().trim() || 'standard'
    if (trimNorm === 'standard') {
      return lookupCode(codes, 'wheel', vehicleType, '18_standard')
    }
    return lookupCode(codes, 'wheel', vehicleType, '18_premium')
  }

  return lookupCode(codes, 'wheel', vehicleType, wheelSize)
}

// Normalize German interior labels to English values
function normalizeInterior(interior: string | null | undefined): string {
  const raw = interior?.toLowerCase().trim() || 'black'
  if (raw === 'schwarz') return 'black'
  if (raw === 'weiß' || raw === 'weiss') return 'white'
  return raw
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
  const interiorNorm = normalizeInterior(interior)

  if (vehicleType === 'Model 3' && trimNorm === 'premium') {
    const driveNorm = drive?.toLowerCase().trim()
    if (driveNorm === 'awd') {
      const code = lookupCode(codes, 'interior', vehicleType, `premium_awd_${interiorNorm}`)
      if (code) return code
      return lookupCode(codes, 'interior', vehicleType, `premium_awd_black`)
    }
  }

  const key = `${trimNorm}_${interiorNorm}`
  const code = lookupCode(codes, 'interior', vehicleType, key)
  if (code) return code

  // Fall back to black interior if requested color doesn't exist for this trim
  return lookupCode(codes, 'interior', vehicleType, `${trimNorm}_black`)
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

// Cache check results in memory to avoid re-checking within the same session
// Maps cacheUrl → true (cached) | false (not cached)
const cacheStatus = new Map<string, boolean>()

// Check cache via fetch (no console noise for 404s unlike img tags)
async function checkCache(cacheUrl: string): Promise<boolean> {
  if (cacheStatus.has(cacheUrl)) return cacheStatus.get(cacheUrl)!
  try {
    const res = await fetch(cacheUrl, { method: 'HEAD' })
    const hit = res.ok
    cacheStatus.set(cacheUrl, hit)
    return hit
  } catch {
    cacheStatus.set(cacheUrl, false)
    return false
  }
}

// Try to fetch image from Tesla via CORS and upload to our cache (fire-and-forget)
function tryUploadToCache(teslaUrl: string, cacheUrl: string) {
  fetch(teslaUrl, { mode: 'cors' })
    .then(res => {
      if (!res.ok) return
      return res.blob()
    })
    .then(blob => {
      if (!blob || blob.size < 1024) return
      return fetch(cacheUrl, { method: 'POST', body: blob })
    })
    .then(res => {
      if (res?.ok) {
        // Mark as cached for future loads in this session
        cacheStatus.set(cacheUrl, true)
      }
    })
    .catch(() => {}) // Silently ignore CORS or network failures
}

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
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const uploadAttempted = useRef(false)

  const modelSlug = vehicleType === 'Model Y' ? 'my' : 'm3'
  const apiSize = fetchSize || size
  const optionsStr = buildOptionsString(vehicleType, color, wheels, model, drive, interior, codes)
  const cacheUrl = buildCacheUrl(modelSlug, optionsStr, view, apiSize)
  const teslaUrl = buildTeslaUrl(modelSlug, optionsStr, view, apiSize)

  // Check cache via fetch, then set the img src
  useEffect(() => {
    uploadAttempted.current = false
    setHasError(false)
    setIsLoading(true)
    setImgSrc(null)

    checkCache(cacheUrl).then(cached => {
      setImgSrc(cached ? cacheUrl : teslaUrl)
    })
  }, [cacheUrl, teslaUrl])

  const handleLoad = () => {
    setIsLoading(false)
    // If loaded from Tesla, try to upload to cache in background
    if (imgSrc === teslaUrl && !uploadAttempted.current) {
      uploadAttempted.current = true
      tryUploadToCache(teslaUrl, cacheUrl)
    }
  }

  const handleError = () => {
    if (imgSrc === cacheUrl) {
      // Cache served a bad response, try Tesla directly
      cacheStatus.set(cacheUrl, false)
      setImgSrc(teslaUrl)
    } else {
      setHasError(true)
      setIsLoading(false)
    }
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
      {imgSrc && (
        <img
          key={imgSrc}
          src={imgSrc}
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
      )}
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
