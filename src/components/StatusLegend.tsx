'use client'

import { useTranslations } from 'next-intl'
import { Calendar, Car, Check, Factory, FileText, Hash, Info, ShoppingCart } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Phone list status dot, one colour per stage. Production used to share amber
 * with "delivery scheduled", so the two could not be told apart.
 */
export const STATUS_DOT_CLASS: Record<string, string> = {
  ordered: 'bg-neutral-400',
  vin_received: 'bg-blue-500',
  production: 'bg-violet-500',
  papers_received: 'bg-cyan-500',
  delivery_scheduled: 'bg-amber-500',
  delivered: 'bg-green-500',
}

const STAGES = [
  { status: 'ordered', label: 'ordered', icon: ShoppingCart },
  { status: 'vin_received', label: 'vinReceived', icon: Hash },
  { status: 'production', label: 'production', icon: Factory },
  { status: 'papers_received', label: 'papers', icon: FileText },
  { status: 'delivery_scheduled', label: 'deliveryScheduled', icon: Calendar },
  { status: 'delivered', label: 'delivered', icon: Car },
] as const

/**
 * A small ⓘ that explains the status column. The step icons only had hover
 * tooltips, which a phone never shows and which say nothing until you aim at
 * one; red for "done" in particular reads as an error without a key.
 */
export function StatusLegend({ variant, className }: { variant: 'steps' | 'dots'; className?: string }) {
  const t = useTranslations('progress')

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        aria-label={t('legendOpen')}
      >
        <Info className="h-3.5 w-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 text-xs">
        <p className="mb-2 text-sm font-medium">{t('legendTitle')}</p>
        {variant === 'steps' ? (
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>
              {t('legendDone')}
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-primary/40"><Hash className="h-3 w-3" /></span>
              {t('legendCurrent')}
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground"><Factory className="h-3 w-3" /></span>
              {t('legendPending')}
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white"><Calendar className="h-3 w-3" /></span>
              {t('deliveryScheduled')}
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white"><Car className="h-3 w-3" /></span>
              {t('delivered')}
            </li>
            <li className="mt-2 border-t pt-2 text-muted-foreground">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {STAGES.filter(s => s.status !== 'delivery_scheduled').map(({ status, label, icon: Icon }) => (
                  <span key={status} className="inline-flex items-center gap-1">
                    <Icon className="h-3 w-3" />{t(label)}
                  </span>
                ))}
              </span>
            </li>
          </ul>
        ) : (
          <ul className="space-y-1.5">
            {STAGES.map(({ status, label }) => (
              <li key={status} className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', STATUS_DOT_CLASS[status])} aria-hidden />
                {t(label)}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
