'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { messageKeyForCode } from '@/lib/api-errors'

interface ApiErrorPayload {
  error?: string
  code?: string
}

/**
 * Turns an API error response into a message in the reader's language.
 *
 * Prefers the machine-readable `code`; falls back to the server's own text when
 * a code is absent or not yet mapped, and to `fallback` when there is neither.
 * The fallback chain matters — the API still answers older clients, and not
 * every route has been given a code.
 */
export function useApiError() {
  const t = useTranslations()

  return useCallback(
    (payload: ApiErrorPayload | null | undefined, fallback: string): string => {
      const key = messageKeyForCode(payload?.code)
      if (key && t.has(key as Parameters<typeof t.has>[0])) {
        return t(key as Parameters<typeof t>[0])
      }
      return payload?.error || fallback
    },
    [t],
  )
}
