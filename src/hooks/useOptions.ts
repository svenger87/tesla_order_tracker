'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  COUNTRIES,
  MODELS,
  MODEL_3_TRIMS,
  RANGES,
  DRIVES,
  COLORS,
  INTERIORS,
  WHEELS,
  MODEL_3_WHEELS,
  AUTOPILOT_OPTIONS,
  TOW_HITCH_OPTIONS,
  VehicleType,
} from '@/lib/types'

interface OptionMetadata {
  flag?: string
  hex?: string
  border?: boolean
}

interface ApiOption {
  id: string
  type: string
  value: string
  label: string
  vehicleType: string | null  // null = applies to all vehicles
  metadata: OptionMetadata | null
  sortOrder: number
}

// Normalized option format for use in forms
export interface FormOption {
  value: string
  label: string
  flag?: string
  hex?: string
  border?: boolean
}

// Convert API options to form options
function apiToFormOptions(apiOptions: ApiOption[]): FormOption[] {
  return apiOptions.map(opt => ({
    value: opt.value,
    label: opt.label,
    flag: opt.metadata?.flag,
    hex: opt.metadata?.hex,
    border: opt.metadata?.border,
  }))
}

// Convert hardcoded options to form options format
function hardcodedToFormOptions(
  options: Array<{ value: string; label: string; flag?: string; hex?: string; border?: boolean }>
): FormOption[] {
  return options.map(opt => ({
    value: opt.value,
    label: opt.label,
    flag: opt.flag,
    hex: opt.hex,
    border: opt.border,
  }))
}

// Fallback hardcoded options by type (global options apply to all vehicles)
const FALLBACK_OPTIONS: Record<string, FormOption[]> = {
  country: hardcodedToFormOptions(COUNTRIES.map(c => ({ value: c.value, label: c.label, flag: c.flag }))),
  model: hardcodedToFormOptions(MODELS),  // Model Y trims
  range: hardcodedToFormOptions(RANGES),
  drive: hardcodedToFormOptions(DRIVES),
  color: hardcodedToFormOptions(COLORS),
  interior: hardcodedToFormOptions(INTERIORS),
  wheels: hardcodedToFormOptions(WHEELS),  // Model Y wheels
  autopilot: hardcodedToFormOptions(AUTOPILOT_OPTIONS),
  towHitch: hardcodedToFormOptions(TOW_HITCH_OPTIONS),
}

// Vehicle-specific fallback overrides
const VEHICLE_FALLBACK_OPTIONS: Record<VehicleType, Partial<Record<string, FormOption[]>>> = {
  'Model Y': {
    model: hardcodedToFormOptions(MODELS),
    wheels: hardcodedToFormOptions(WHEELS),
  },
  'Model 3': {
    model: hardcodedToFormOptions(MODEL_3_TRIMS),
    wheels: hardcodedToFormOptions(MODEL_3_WHEELS),
  },
}

// Option types that have translations in the message files
const TRANSLATABLE_TYPES = new Set(['country', 'interior', 'range', 'towHitch', 'autopilot'])

export function useOptions(vehicleType?: VehicleType) {
  const [apiOptions, setApiOptions] = useState<ApiOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const to = useTranslations('options')
  const locale = useLocale()

  useEffect(() => {
    async function fetchOptions() {
      try {
        // Fetch options, optionally filtered by vehicle type
        const params = new URLSearchParams()
        if (vehicleType) {
          params.set('vehicleType', vehicleType)
        }
        const url = `/api/options${params.toString() ? `?${params}` : ''}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setApiOptions(data)
        } else {
          setError('Failed to load options')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchOptions()
  }, [vehicleType])  // Re-fetch when vehicle type changes

  // Memoize options by type, falling back to hardcoded if API returns empty
  const options = useMemo(() => {
    const getOptionsForType = (type: string): FormOption[] => {
      // Filter API options by type and vehicle type (null matches all vehicles)
      const typeOptions = apiOptions.filter(o =>
        o.type === type &&
        (o.vehicleType === null || o.vehicleType === vehicleType)
      )
      if (typeOptions.length > 0) {
        return apiToFormOptions(typeOptions)
      }
      // Use vehicle-specific fallback if available, otherwise use global fallback
      if (vehicleType && VEHICLE_FALLBACK_OPTIONS[vehicleType]?.[type]) {
        return VEHICLE_FALLBACK_OPTIONS[vehicleType][type]!
      }
      return FALLBACK_OPTIONS[type] || []
    }

    // Translate option labels for types that have translations
    const translateOptions = (type: string, opts: FormOption[]): FormOption[] => {
      if (!TRANSLATABLE_TYPES.has(type)) return opts
      return opts.map(opt => {
        const key = `${type}.${opt.value}`
        return to.has(key as any)
          ? { ...opt, label: to(key as any) }
          : opt
      })
    }

    // Sort countries alphabetically with current locale for proper sorting
    const sortedCountries = translateOptions('country', getOptionsForType('country'))
      .sort((a, b) => a.label.localeCompare(b.label, locale, { sensitivity: 'base' }))

    return {
      countries: sortedCountries,
      models: getOptionsForType('model'),
      ranges: translateOptions('range', getOptionsForType('range')),
      drives: getOptionsForType('drive'),
      colors: getOptionsForType('color'),
      interiors: translateOptions('interior', getOptionsForType('interior')),
      wheels: getOptionsForType('wheels'),
      autopilot: translateOptions('autopilot', getOptionsForType('autopilot')),
      towHitch: translateOptions('towHitch', getOptionsForType('towHitch')),
      deliveryLocations: getOptionsForType('deliveryLocation'),
    }
  }, [apiOptions, vehicleType, to, locale])

  return {
    options,
    loading,
    error,
    // For backwards compatibility, expose the raw lists
    ...options,
  }
}
