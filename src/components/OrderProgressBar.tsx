'use client'

import { Fragment, memo } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Order } from '@/lib/types'
import { getOrderStatus } from '@/lib/statistics'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ShoppingCart, Hash, Factory, FileText, Car, Check, Calendar } from 'lucide-react'

interface OrderProgressBarProps {
  order: Order
  compact?: boolean
  barOnly?: boolean // Simple colored bar instead of step icons (for card view)
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

export function OrderProgressBar({ order, compact = false, barOnly = false }: OrderProgressBarProps) {
  const t = useTranslations('progress')

  const currentStatus = getOrderStatus(order)
  const currentIndex = STEP_INDEX[currentStatus]

  const isScheduled = currentStatus === 'delivery_scheduled'

  // Simple bar for the mobile card view.
  // This carried six hand-picked gradients — green, amber, blue, purple, cyan,
  // grey — which was a seventh palette in the project and meant the same stage
  // looked different here than in the table. Same three tones as the table now.
  if (barOnly) {
    const progress = ((currentIndex + 1) / STEPS.length) * 100
    const tone = STATE_TONE[currentStatus]

    return (
      <div className="h-2.5 w-full bg-muted/50 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', TONE_FILL[tone])}
          style={{ width: `${progress}%` }}
        />
      </div>
    )
  }

  // Compact circle progress bar for table view — memoized, no Framer Motion
  if (compact) {
    return <CompactProgressBar order={order} />
  }

  // Full progress bar with step icons (only used in detail views, not in tables)
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const isCompleted = index <= currentIndex
        const isCurrent = index === currentIndex
        const isLastStep = index === STEPS.length - 1
        const isScheduledDelivery = isLastStep && isScheduled
        const Icon = isScheduledDelivery ? Calendar : step.icon
        const dateValue = order[step.dateField]

        return (
          <Fragment key={step.key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    'relative flex items-center justify-center rounded-full transition-all h-8 w-8',
                    isScheduledDelivery
                      ? 'bg-amber-500 text-white'
                      : isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    isCurrent && !isScheduledDelivery && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                    isScheduledDelivery && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background'
                  )}
                >
                  {isCompleted && index < currentIndex && !isScheduledDelivery ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  {isCurrent && !isScheduledDelivery && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      style={{ opacity: 0.3 }}
                    />
                  )}
                  {isScheduledDelivery && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-amber-500"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      style={{ opacity: 0.3 }}
                    />
                  )}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">
                  {isScheduledDelivery ? t('deliveryScheduled') : t(step.labelKey)}
                </p>
                {dateValue && (
                  <p className="text-xs opacity-80">{dateValue}</p>
                )}
              </TooltipContent>
            </Tooltip>

            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 transition-colors min-w-4',
                  index < currentIndex ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
