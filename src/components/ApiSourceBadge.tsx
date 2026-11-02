'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

/**
 * Apps whose own icon goes in front of their badge, keyed by the badge text in
 * lower case. Anything else shows the text alone.
 */
const SOURCE_ICONS: Record<string, string> = {
  tostrr: '/tostrr-icon.svg',
}

/**
 * The badge for an order an API client created, showing the badge text an
 * admin set on that client's key (ApiKey.source). TOST keeps its own logo,
 * so 'tost' and manual orders render nothing here.
 */
export function ApiSourceBadge({ source, className }: { source: string | null | undefined; className?: string }) {
  const t = useTranslations('home')
  if (!source || source === 'tost') return null
  const icon = SOURCE_ICONS[source.toLowerCase()]
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-1 rounded-sm border border-primary/40 bg-primary/10 px-1 py-px font-medium text-primary', className)}
      title={t('apiSourceHint', { source })}
    >
      {icon && <Image src={icon} alt="" width={12} height={12} className="h-[1.2em] w-[1.2em] rounded-[3px]" />}
      {source}
    </span>
  )
}
