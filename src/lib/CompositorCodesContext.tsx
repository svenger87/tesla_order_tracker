'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Nested map: { [category]: { [vehicleType]: { [lookupKey]: { code, label } } } }
export type CompositorCodeMap = Record<string, Record<string, Record<string, { code: string; label: string | null }>>>

const CompositorCodesContext = createContext<CompositorCodeMap | null>(null)

export function CompositorCodesProvider({ children }: { children: ReactNode }) {
  const [codes, setCodes] = useState<CompositorCodeMap | null>(null)

  useEffect(() => {
    fetch('/api/compositor-codes')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setCodes(data) })
      .catch(() => {})
  }, [])

  return (
    <CompositorCodesContext.Provider value={codes}>
      {children}
    </CompositorCodesContext.Provider>
  )
}

export function useCompositorCodes() {
  return useContext(CompositorCodesContext)
}

// Helper: look up a single code from the map
export function lookupCode(
  codes: CompositorCodeMap | null,
  category: string,
  vehicleType: string,
  lookupKey: string
): string | null {
  return codes?.[category]?.[vehicleType]?.[lookupKey]?.code ?? null
}
