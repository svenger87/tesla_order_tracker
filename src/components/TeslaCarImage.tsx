'use client'

import { memo, useState, useEffect, useRef } from 'react'
import { Car } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COLORS, VehicleType } from '@/lib/types'
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
  'coastal_blue': 'PB03',
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
  vehicleType: VehicleType
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
  vehicleType: VehicleType,
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
  // bkba_opt=1 is a transparent PNG. Option 2 is a JPEG on a white canvas:
  // it showed as a white box on the dark theme, and the cache below only
  // accepts PNGs, so none of those images were ever cached.
  const params = new URLSearchParams({
    bkba_opt: '1',
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
    // Must match buildParamKey's suffix and the bg handling in the route.
    bg: 'transparent',
  })
  return `/api/compositor-image?${params.toString()}`
}

// Manifest-based cache check: fetch list of cached param keys once, check locally (no 404s)
let manifestPromise: Promise<Set<string>> | null = null
let manifestSet = new Set<string>()

function fetchManifest(): Promise<Set<string>> {
  if (!manifestPromise) {
    manifestPromise = fetch('/api/compositor-image?manifest=true')
      .then(res => res.ok ? res.json() : [])
      .then((keys: string[]) => {
        manifestSet = new Set(keys)
        return manifestSet
      })
      .catch(() => {
        manifestPromise = null // retry on next call
        return manifestSet
      })
  }
  return manifestPromise
}

function buildParamKey(modelSlug: string, optionsStr: string, view: string, size: number): string {
  // `_transparent`: entries cached without it are opaque white images.
  return `${modelSlug}_${optionsStr}_${view}_${size}_transparent`
}

// Try to fetch image from Tesla via CORS and upload to our cache (fire-and-forget)
function tryUploadToCache(teslaUrl: string, cacheUrl: string, paramKey: string) {
  fetch(teslaUrl, { mode: 'cors' })
    .then(res => {
      if (!res.ok) return
      return res.blob()
    })
    .then(async blob => {
      if (!blob || blob.size < 1024) return
      const signature = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
      const isPng = signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4E && signature[3] === 0x47
      if (!isPng) return
      return fetch(cacheUrl, { method: 'POST', body: blob })
    })
    .then(res => {
      if (res?.ok) {
        // Add to local manifest for future loads in this session
        manifestSet.add(paramKey)
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

  const MODEL_SLUGS: Record<string, string> = {
    'Model Y': 'my', 'Model 3': 'm3', 'Model S': 'ms',
    'Model X': 'mx', 'Cybertruck': 'ct', 'Roadster': 'roadster',
  }
  const modelSlug = MODEL_SLUGS[vehicleType] || 'my'
  const apiSize = fetchSize || size
  const optionsStr = buildOptionsString(vehicleType, color, wheels, model, drive, interior, codes)
  const paramKey = buildParamKey(modelSlug, optionsStr, view, apiSize)
  const cacheUrl = buildCacheUrl(modelSlug, optionsStr, view, apiSize)
  const teslaUrl = buildTeslaUrl(modelSlug, optionsStr, view, apiSize)

  // Check manifest (no HTTP requests = no 404 console noise)
  useEffect(() => {
    let cancelled = false
    uploadAttempted.current = false

    queueMicrotask(() => {
      if (cancelled) return
      setHasError(false)
      setIsLoading(true)
      setImgSrc(null)
    })

    fetchManifest().then(manifest => {
      if (cancelled) return
      setImgSrc(manifest.has(paramKey) ? cacheUrl : teslaUrl)
    })

    return () => {
      cancelled = true
    }
  }, [paramKey, cacheUrl, teslaUrl])

  const handleLoad = () => {
    setIsLoading(false)
    // If loaded from Tesla, try to upload to cache in background
    if (imgSrc === teslaUrl && !uploadAttempted.current) {
      uploadAttempted.current = true
      tryUploadToCache(teslaUrl, cacheUrl, paramKey)
    }
  }

  const handleError = () => {
    if (imgSrc === cacheUrl) {
      // Cache served a bad response, try Tesla directly
      manifestSet.delete(paramKey)
      setImgSrc(teslaUrl)
    } else {
      setHasError(true)
      setIsLoading(false)
    }
  }

  // Which fields were missing is useful when debugging compositor codes, but
  // it is not something a visitor can act on; it goes into the tooltip only.
  const missing: string[] = []
  if (!color) missing.push('color')
  if (!wheels) missing.push('wheels')
  if (!model) missing.push('model')
  if (!drive) missing.push('drive')
  if (!interior) missing.push('interior')

  if (hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-muted/60 text-muted-foreground",
          className
        )}
        style={{ width: size, height: Math.round(size * 0.5625) }}
        role="img"
        aria-label={vehicleType}
        title={missing.length > 0 ? `${vehicleType} (${missing.join(', ')}?)` : vehicleType}
      >
        <Car className="h-1/2 max-h-8 w-auto opacity-60" aria-hidden />
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <div
          className="absolute inset-0 animate-pulse rounded-md bg-muted/50"
          style={{ width: size, height: Math.round(size * 0.5625) }}
          aria-hidden
        />
      )}
      {imgSrc && (
        // Dynamic Tesla compositor URLs are already remote/lazy/fallback controlled;
        // next/image emits aspect-ratio warnings for these constrained table images.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={imgSrc}
          src={imgSrc}
          alt={`${vehicleType} - ${color || 'default'} with ${wheels || 'default'}" wheels`}
          className={cn(
            "object-contain",
            isLoading && "opacity-0"
          )}
          style={{ width: size, height: 'auto' }}
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
      // Drawn into a 48px slot on the phone order list. It used to lay out at
      // 200px and rely on the slot clipping it, which also made the fallback
      // label wrap; 400px is what the desktop table fetches, so both share cache.
      size={48}
      fetchSize={400}
      className={className}
    />
  )
})
