'use client'

import { Fragment } from 'react'
import { Order } from '@/lib/types'
import { getOrderStatus } from '@/lib/statistics'
import { useTranslations } from 'next-intl'
import { motion, useReducedMotion } from 'framer-motion'
import { ShoppingCart, Hash, FileText, Car, Check, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  delivery_scheduled: 3,
  delivered: 3,
}

interface ProgressTimelineProps {
  order: Order
}

export function ProgressTimeline({ order }: ProgressTimelineProps) {
  const t = useTranslations('progress')
  const prefersReducedMotion = useReducedMotion()

  const currentStatus = getOrderStatus(order)
  const currentIndex = STEP_INDEX[currentStatus]
  const isScheduled = currentStatus === 'delivery_scheduled'
  const isDelivered = currentStatus === 'delivered'

  const progressValue = (currentIndex + 1) * 25

  return (
    <div
      role="progressbar"
      aria-valuenow={progressValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t(currentStatus === 'delivery_scheduled' ? 'deliveryScheduled' : STEPS[Math.min(currentIndex, 3)].labelKey)}
      className="w-full"
    >
      <div className="flex items-start justify-between relative">
        {/* Connecting lines behind circles */}
        <div className="absolute top-6 sm:top-7 left-0 right-0 flex px-6 sm:px-7" aria-hidden="true">
          {STEPS.slice(0, -1).map((_, index) => (
            <div
              key={index}
              className={cn(
                'flex-1 h-1 rounded-full transition-colors duration-500',
                index < currentIndex
                  ? isDelivered ? 'bg-green-500' : 'bg-primary'
                  : 'bg-muted'
              )}
            />
          ))}
        </div>

        {STEPS.map((step, index) => {
          const isCompleted = index <= currentIndex
          const isCurrent = index === currentIndex
          const isLastStep = index === STEPS.length - 1
          const isScheduledDelivery = isLastStep && isScheduled
          const Icon = isScheduledDelivery ? Calendar : step.icon
          const dateValue = order[step.dateField]

          const circleColor = isScheduledDelivery
            ? 'bg-amber-500 text-white'
            : isLastStep && isDelivered
              ? 'bg-green-500 text-white'
              : isCompleted
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'

          const ringStyle = isCurrent && !isScheduledDelivery && !isDelivered
            ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
            : isScheduledDelivery
              ? 'ring-2 ring-amber-500/50 ring-offset-2 ring-offset-background'
              : isDelivered && isLastStep
                ? 'ring-2 ring-green-500/50 ring-offset-2 ring-offset-background'
                : ''

          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative z-10">
              <motion.div
                initial={prefersReducedMotion ? false : { scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                className={cn(
                  'relative flex items-center justify-center rounded-full h-12 w-12 sm:h-14 sm:w-14 transition-colors',
                  circleColor,
                  ringStyle,
                )}
              >
                {isCompleted && index < currentIndex && !isScheduledDelivery ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
                {/* Pulse animation for current step */}
                {isCurrent && !prefersReducedMotion && (
                  <motion.div
                    className={cn(
                      'absolute inset-0 rounded-full',
                      isScheduledDelivery
                        ? 'bg-amber-500'
                        : isDelivered
                          ? 'bg-green-500'
                          : 'bg-primary'
                    )}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  />
                )}
              </motion.div>

              <motion.span
                initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.1 }}
                className={cn(
                  'mt-2 text-xs sm:text-sm font-medium text-center',
                  isCompleted ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {isScheduledDelivery ? t('deliveryScheduled') : t(step.labelKey)}
              </motion.span>

              {dateValue && (
                <motion.span
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  className="mt-0.5 text-[11px] text-muted-foreground"
                >
                  {dateValue}
                </motion.span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
