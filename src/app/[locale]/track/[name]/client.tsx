'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Order, VehicleType, VEHICLE_TYPES } from '@/lib/types'
import { Link } from '@/i18n/navigation'
import { ProgressTimeline } from '@/components/ProgressTimeline'
import { SimilarOrders } from '@/components/SimilarOrders'
import { SupportCard } from '@/components/SupportCard'
import { TeslaCarImage } from '@/components/TeslaCarImage'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, Share2, Check, Calendar, MapPin, TrendingUp, Clock, AlertTriangle } from 'lucide-react'
import { TwemojiEmoji } from '@/components/TwemojiText'
import { motion } from 'framer-motion'

interface TrackingPageClientProps {
  order: Order
  similar: Order[]
  prediction: {
    optimisticDays: number
    expectedDays: number
    pessimisticDays: number
    optimisticDate: string
    expectedDate: string
    pessimisticDate: string
    confidence: 'high' | 'medium' | 'low'
    sampleSize: number
    filtersUsed: string[]
    recencyWindowDays: number | null
    daysElapsedFromReference: number
  } | null
  fasterPercent: number | null
  detailFields: { label: string; value: string | null }[]
  durationFields: { label: string; value: number | null }[]
  colorInfo: { hex: string; border: boolean; label: string } | null
  countryInfo: { label: string; flag: string } | null
  donationUrl?: string | null
  paypalUrl?: string | null
  resolvedLabels: {
    model: string | null
    range: string | null
    drive: string | null
    interior: string | null
  }
}

export function TrackingPageClient({
  order,
  similar,
  prediction,
  fasterPercent,
  detailFields,
  durationFields,
  colorInfo,
  countryInfo,
  donationUrl,
  paypalUrl,
  resolvedLabels,
}: TrackingPageClientProps) {
  const t = useTranslations('tracking')
  const tc = useTranslations('common')
  const [copied, setCopied] = useState(false)

  // Confetti for delivered orders
  useEffect(() => {
    if (order.deliveryDate) {
      // Check if delivery is in the past
      const parts = order.deliveryDate.split('.')
      if (parts.length === 3) {
        const [day, month, year] = parts.map(Number)
        const deliveryDate = new Date(year, month - 1, day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (deliveryDate <= today) {
          import('@/components/DeliveryCelebration').then(mod => mod.triggerCelebration())
        }
      }
    }
  }, [order.deliveryDate])

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isKnownVehicle = VEHICLE_TYPES.some(vt => vt.value === order.vehicleType)

  const confidenceColor = prediction?.confidence === 'high'
    ? 'text-green-600 dark:text-green-400'
    : prediction?.confidence === 'medium'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Back link + share */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t('backToOverview')}
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
          >
            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {copied ? t('linkCopied') : t('shareOrder')}
          </Button>
        </div>

        {/* Order hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Car image */}
                {isKnownVehicle && (
                  <div className="shrink-0">
                    <TeslaCarImage
                      vehicleType={order.vehicleType as VehicleType}
                      color={order.color}
                      wheels={order.wheels}
                      model={order.model}
                      drive={order.drive}
                      interior={order.interior}
                      view="STUD_3QTR"
                      size={280}
                      fetchSize={800}
                    />
                  </div>
                )}

                {/* Order info */}
                <div className="flex-1 text-center sm:text-left space-y-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{order.name}</h1>
                    <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start text-sm text-muted-foreground">
                      {order.orderDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {order.orderDate}
                        </span>
                      )}
                      {countryInfo && (
                        <span className="flex items-center gap-1">
                          <TwemojiEmoji emoji={countryInfo.flag} size={14} />
                          {countryInfo.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Config badges */}
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {order.vehicleType && (
                      <Badge variant="default" className="font-bold">
                        {{ 'Model Y': 'MY', 'Model 3': 'M3', 'Model S': 'MS', 'Model X': 'MX', 'Cybertruck': 'CT', 'Roadster': 'R' }[order.vehicleType] || order.vehicleType}
                      </Badge>
                    )}
                    {resolvedLabels.model && (
                      <Badge
                        variant={resolvedLabels.model.toLowerCase().includes('performance') ? 'destructive' : 'secondary'}
                        className={cn(
                          resolvedLabels.model.toLowerCase().includes('premium')
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                            : ''
                        )}
                      >
                        {resolvedLabels.model}
                      </Badge>
                    )}
                    {resolvedLabels.drive && (
                      <Badge variant="outline" className={cn("font-mono",
                        resolvedLabels.drive.toLowerCase().includes('awd')
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'
                          : ''
                      )}>
                        {resolvedLabels.drive}
                      </Badge>
                    )}
                    {colorInfo && (
                      <Badge variant="outline" className="gap-1.5">
                        <span
                          className={cn(
                            "w-3 h-3 rounded-full inline-block",
                            colorInfo.border && "border border-border"
                          )}
                          style={{ backgroundColor: colorInfo.hex }}
                        />
                        {colorInfo?.label || order.color}
                      </Badge>
                    )}
                  </div>

                  {/* Faster percent badge */}
                  {fasterPercent !== null && fasterPercent > 0 && (
                    <div className="flex justify-center sm:justify-start">
                      <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-900/30 gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {t('deliveredFaster', { percent: fasterPercent })}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress timeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <ProgressTimeline order={order} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Delivery prediction (only for non-delivered orders) */}
        {prediction && !order.deliveryDate && (() => {
          const elapsed = prediction.daysElapsedFromReference
          const past = (n: number) => n < elapsed
          const exceedsPessimistic = elapsed > prediction.pessimisticDays
          return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('yourDelivery')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {exceedsPessimistic && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20 p-2.5">
                    <p className="text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{t('exceedsPessimisticHint', { days: elapsed })}</span>
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className={cn(
                    "text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800",
                    past(prediction.optimisticDays) && "opacity-50",
                  )}>
                    <p className="text-xs text-muted-foreground mb-1">{t('optimistic')}</p>
                    <p className={cn("font-bold text-green-700 dark:text-green-400", past(prediction.optimisticDays) && "line-through")}>{prediction.optimisticDate}</p>
                    <p className="text-xs text-muted-foreground">{prediction.optimisticDays}d</p>
                  </div>
                  <div className={cn(
                    "text-center p-3 rounded-lg bg-primary/5 border border-primary/20",
                    past(prediction.expectedDays) && "opacity-50",
                  )}>
                    <p className="text-xs text-muted-foreground mb-1">{t('expected')}</p>
                    <p className={cn("font-bold text-primary", past(prediction.expectedDays) && "line-through")}>{prediction.expectedDate}</p>
                    <p className="text-xs text-muted-foreground">{prediction.expectedDays}d</p>
                  </div>
                  <div className={cn(
                    "text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800",
                    past(prediction.pessimisticDays) && "opacity-50",
                  )}>
                    <p className="text-xs text-muted-foreground mb-1">{t('pessimistic')}</p>
                    <p className={cn("font-bold text-amber-700 dark:text-amber-400", past(prediction.pessimisticDays) && "line-through")}>{prediction.pessimisticDate}</p>
                    <p className="text-xs text-muted-foreground">{prediction.pessimisticDays}d</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className={confidenceColor}>
                    {t('predictionConfidence', { level: t(`confidence_${prediction.confidence}`) })}
                  </span>
                  <span>
                    {prediction.recencyWindowDays
                      ? t('predictionSampleRecent', { count: prediction.sampleSize, days: prediction.recencyWindowDays })
                      : t('predictionSample', { count: prediction.sampleSize })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          )
        })()}

        {/* Duration stats (for delivered orders) */}
        {durationFields.some(f => f.value != null) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {durationFields.filter(f => f.value != null).map((field) => (
                    <div key={field.label} className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">{field.label}</p>
                      <p className="text-2xl font-bold font-mono">{field.value}</p>
                      <p className="text-xs text-muted-foreground">{tc('days')}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Support card — post-value donation ask */}
        {donationUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <SupportCard donationUrl={donationUrl} paypalUrl={paypalUrl ?? undefined} />
          </motion.div>
        )}

        {/* Similar orders */}
        {similar.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <SimilarOrders orders={similar} currentOrderId={order.id} />
          </motion.div>
        )}

        {/* Order details grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('orderDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {detailFields.filter(f => f.value).map((field) => (
                  <div key={field.label} className="flex justify-between items-baseline py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm text-muted-foreground">{field.label}</span>
                    <span className="text-sm font-medium text-right ml-4 truncate max-w-[60%]">{field.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
