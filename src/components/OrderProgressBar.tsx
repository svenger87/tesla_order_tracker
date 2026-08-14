'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { Order } from '@/lib/types'
import { getOrderStatus } from '@/lib/statistics'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ShoppingCart, Hash, Factory, FileText, Car } from 'lucide-react'

interface OrderProgressBarProps {
  order: Order
  /** Kept so the single call site reads as before; there is only one form now. */
  compact?: boolean
}

const STEPS = [
  { key: 'ordered', labelKey: 'ordered', icon: ShoppingCart, dateField: 'orderDate' as const },
  { key: 'vin_received', labelKey: 'vinReceived', icon: Hash, dateField: 'vinReceivedDate' as const },
  { key: 'production', labelKey: 'production', icon: Factory, dateField: 'productionDate' as const },
  { key: 'papers_received', labelKey: 'papers', icon: FileText, dateField: 'papersReceivedDate' as const },
  { key: 'delivered', labelKey: 'delivered', icon: Car, dateField: 'deliveryDate' as const },
]

type StepKey = 'ordered' | 'vin_received' | 'production' | 'papers_received' | 'delivery_scheduled' | 'delivered'

const STEP_INDEX: Record<StepKey, number> = {
  ordered: 0,
  vin_received: 1,
  production: 2,
  papers_received: 3,
  delivery_scheduled: 4, // Same position as delivered, but different style
  delivered: 4,
}

/** Which token a stage's colour comes from. Red is not among them. */
const STATE_TONE: Record<StepKey, 'done' | 'moving' | 'waiting'> = {
  ordered: 'waiting',
  vin_received: 'moving',
  production: 'moving',
  papers_received: 'moving',
  delivery_scheduled: 'done',
  delivered: 'done',
}

const TONE_TEXT = {
  done: 'text-success',
  moving: 'text-pending',
  waiting: 'text-muted-foreground',
} as const

const TONE_FILL = {
  done: 'bg-success',
  moving: 'bg-pending',
  waiting: 'bg-muted-foreground/50',
} as const

/**
 * Status for the table: the stage as a word, with a five-segment track under it.
 *
 * It used to be five circles, and completed steps were painted in the brand red
 * — so the column read as a row of identical red dots you had to decode, while
 * red simultaneously meant "brand", "primary action" and "Performance trim"
 * elsewhere. A word is legible at a glance and across a room; the track keeps
 * the "how far along" reading that the dots were there for.
 */
const CompactProgressBar = memo(function CompactProgressBar({ order }: { order: Order }) {
  const t = useTranslations('progress')
  const currentStatus = getOrderStatus(order)
  const currentIndex = STEP_INDEX[currentStatus]
  const tone = STATE_TONE[currentStatus]

  const label = currentStatus === 'delivery_scheduled'
    ? t('deliveryScheduled')
    : t(STEPS[currentIndex].labelKey)

  const reached = STEPS.filter((_, i) => i <= currentIndex).length

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col gap-1 leading-none">
          <span className={cn('truncate text-[11px] font-semibold uppercase tracking-[0.08em]', TONE_TEXT[tone])}>
            {label}
          </span>
          <span className="flex gap-[3px]" aria-hidden>
            {STEPS.map((step, index) => (
              <span
                key={step.key}
                className={cn(
                  'h-[3px] w-3 rounded-[1px]',
                  index <= currentIndex ? TONE_FILL[tone] : 'bg-muted-foreground/20',
                )}
              />
            ))}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{label}</p>
        <p className="text-xs opacity-80">
          {t('stepOfTotal', { current: reached, total: STEPS.length })}
        </p>
      </TooltipContent>
    </Tooltip>
  )
})

/**
 * Order status for the table.
 *
 * This file used to carry three variants. The `barOnly` bar and the full
 * icon-step timeline were both unreachable — the only call site anywhere passes
 * `compact` — so they went, along with their two extra colour scales and a pair
 * of infinite pulse animations that ignored the reduced-motion setting. The
 * detail page has its own ProgressTimeline.
 */
export function OrderProgressBar({ order }: OrderProgressBarProps) {
  return <CompactProgressBar order={order} />
}
