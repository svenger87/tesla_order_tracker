'use client'

import { useMemo } from 'react'
import { useLocale } from 'next-intl'

export function useMonthKeyFormatter() {
  const locale = useLocale()

  return useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' })
    return (key: string) => {
      const [y, m] = key.split('-')
      return fmt.format(new Date(parseInt(y), parseInt(m) - 1))
    }
  }, [locale])
}
