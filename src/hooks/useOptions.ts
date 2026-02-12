'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  COUNTRIES,
  MODELS,
  DRIVES,
  COLORS,
  INTERIORS,
  WHEELS,
  AUTOPILOT_OPTIONS,
  TOW_HITCH_OPTIONS,
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

// Fallback hardcoded options by type
const FALLBACK_OPTIONS: Record<string, FormOption[]> = {
  country: hardcodedToFormOptions(COUNTRIES.map(c => ({ value: c.value, label: c.label, flag: c.flag }))),
  model: hardcodedToFormOptions(MODELS),
  drive: hardcodedToFormOptions(DRIVES),
  color: hardcodedToFormOptions(COLORS),
  interior: hardcodedToFormOptions(INTERIORS),
  wheels: hardcodedToFormOptions(WHEELS),
  autopilot: hardcodedToFormOptions(AUTOPILOT_OPTIONS),
  towHitch: hardcodedToFormOptions(TOW_HITCH_OPTIONS),
}

export function useOptions() {
  const [apiOptions, setApiOptions] = useState<ApiOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOptions() {
      try {
        const res = await fetch('/api/options')
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
  }, [])

  // Memoize options by type, falling back to hardcoded if API returns empty
  const options = useMemo(() => {
    const getOptionsForType = (type: string): FormOption[] => {
      const typeOptions = apiOptions.filter(o => o.type === type)
      if (typeOptions.length > 0) {
        return apiToFormOptions(typeOptions)
      }
      return FALLBACK_OPTIONS[type] || []
    }

    // Sort countries alphabetically with German locale for proper umlaut handling
    const sortedCountries = getOptionsForType('country').sort((a, b) =>
      a.label.localeCompare(b.label, 'de', { sensitivity: 'base' })
    )

    return {
      countries: sortedCountries,
      models: getOptionsForType('model'),
      drives: getOptionsForType('drive'),
      colors: getOptionsForType('color'),
      interiors: getOptionsForType('interior'),
      wheels: getOptionsForType('wheels'),
      autopilot: getOptionsForType('autopilot'),
      towHitch: getOptionsForType('towHitch'),
      deliveryLocations: getOptionsForType('deliveryLocation'),
    }
  }, [apiOptions])

  return {
    options,
    loading,
    error,
    // For backwards compatibility, expose the raw lists
    ...options,
  }
}
