'use client'

import { Fragment } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Order } from '@/lib/types'
import { getOrderStatus } from '@/lib/statistics'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ShoppingCart, Hash, FileText, Car, Check, Calendar } from 'lucide-react'

interface OrderProgressBarProps {
  order: Order
  compact?: boolean
  barOnly?: boolean // Simple colored bar instead of step icons (for card view)
}

const STEPS = [
  { key: 'ordered', labelKey: 'ordered', icon: ShoppingCart, dateField: 'orderDate' as const },
  { key: 'vin_received', labelKey: 'vinReceived', icon: Hash, dateField: 'vinReceivedDate' as const },
  { key: 'papers_received', labelKey: 'papers', icon: FileText, dateField: 'papersReceivedDate' as const },
  { key: 'delivered', labelKey: 'delivered', icon: Car, dateField: 'deliveryDate' as const },
]

type StepKey = 'ordered' | 'vin_received' | 'papers_received' | 'delivery_scheduled' | 'delivered'

const STEP_INDEX: Record<StepKey, number> = {
  ordered: 0,
  vin_received: 1,
  papers_received: 2,
  delivery_scheduled: 3, // Same position as delivered, but different style
  delivered: 3,
}

export function OrderProgressBar({ order, compact = false, barOnly = false }: OrderProgressBarProps) {
  const t = useTranslations('progress')

  const currentStatus = getOrderStatus(order)
  const currentIndex = STEP_INDEX[currentStatus]

  const isScheduled = currentStatus === 'delivery_scheduled'

  // Simple colored bar for card view
  if (barOnly) {
    const progress = ((currentIndex + 1) / STEPS.length) * 100
    const barColor = currentStatus === 'delivered'
      ? 'bg-green-500'
      : currentStatus === 'delivery_scheduled'
        ? 'bg-amber-500'
        : currentStatus === 'papers_received'
          ? 'bg-blue-500'
          : currentStatus === 'vin_received'
            ? 'bg-cyan-500'
            : 'bg-gray-400'

    return (
      <div className="h-full w-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full', barColor)}
        />
      </div>
    )
  }

  // Compact circle progress bar for table view
  if (compact) {
    return (
      <div className="flex items-center gap-0">
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
                  <div
                    className={cn(
                      'relative flex items-center justify-center rounded-full transition-colors shrink-0',
                      'h-6 w-6',
                      isScheduledDelivery
                        ? 'bg-amber-500 text-white'
                        : isLastStep && isCompleted && !isScheduled
                          ? 'bg-green-500 text-white'
                          : isCompleted
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
                      isCurrent && !isScheduledDelivery && !isLastStep && 'ring-1.5 ring-primary/50',
                      isScheduledDelivery && 'ring-1.5 ring-amber-500/50'
                    )}
                  >
                    {isCompleted && index < currentIndex && !isScheduledDelivery ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Icon className="h-3 w-3" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">
                    {isScheduledDelivery ? t('deliveryScheduled') : t(step.labelKey)}
                  </p>
                  {dateValue && (
                    <p className="text-xs text-white/80">{dateValue}</p>
                  )}
                </TooltipContent>
              </Tooltip>

              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-px w-1.5 shrink-0',
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

  // Full progress bar with step icons
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
                  <p className="text-xs text-white/80">{dateValue}</p>
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
