'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

/**
 * The badge for an order an API client created, showing the badge text an
 * admin set on that client's key (ApiKey.source). TOST keeps its own logo,
 * so 'tost' and manual orders render nothing here.
 */
export function ApiSourceBadge({ source, className }: { source: string | null | undefined; className?: string }) {
  const t = useTranslations('home')
  if (!source || source === 'tost') return null
  return (
    <span
      className={cn('shrink-0 rounded-sm border border-primary/40 bg-primary/10 px-1 py-px font-medium text-primary', className)}
      title={t('apiSourceHint', { source })}
    >
      {source}
    </span>
  )
}
