'use client'

import { useEffect, useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { motion, useInView } from 'framer-motion'
import { Car, CheckCircle2, Timer, Zap } from 'lucide-react'

interface PulseData {
  totalOrders: number
  deliveredOrders: number
  deliveredPercent: number
  avgDeliveryDays: number | null
  vinsThisWeek: number
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      className="tabular-nums"
      aria-live="polite"
    >
      {isInView ? value : 0}{suffix}
    </motion.span>
  )
}

export function CommunityPulse() {
  const t = useTranslations('trust')
  const [data, setData] = useState<PulseData | null>(null)

  useEffect(() => {
    fetch('/api/pulse')
      .then(res => res.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data || data.totalOrders === 0) return null

  const items = [
    {
      icon: Car,
      value: data.totalOrders,
      label: t('totalOrders'),
      shortLabel: t('totalOrders'),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: CheckCircle2,
      value: data.deliveredOrders,
      suffix: ` (${data.deliveredPercent}%)`,
      label: t('delivered'),
      shortLabel: t('delivered'),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: Timer,
      value: data.avgDeliveryDays,
      suffix: ` ${t('days')}`,
      label: t('avgDeliveryTime'),
      shortLabel: t('avgDeliveryTime'),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Zap,
      value: data.vinsThisWeek,
      label: t('vinsThisWeek'),
      shortLabel: t('vinsShort'),
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ]

  return (
    <div className="relative rounded-xl border bg-gradient-to-r from-primary/5 via-background to-primary/5 p-4 sm:p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className={`rounded-lg ${item.bgColor} p-2 sm:p-2.5 shrink-0`}>
              <item.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${item.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-bold tracking-tight truncate">
                {item.value !== null && item.value !== undefined ? (
                  <>
                    <AnimatedNumber value={item.value} />
                    {item.suffix && <span className="text-sm sm:text-base font-medium text-muted-foreground">{item.suffix}</span>}
                  </>
                ) : (
                  <span>-</span>
                )}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
