'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Order, VEHICLE_TYPES, MODEL_Y_TRIMS, MODEL_3_TRIMS, DRIVES, COUNTRIES } from '@/lib/types'
import { predictDelivery, DeliveryPrediction as PredictionType } from '@/lib/prediction'
import { parseGermanDate } from '@/lib/date-utils'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Zap, Clock, AlertTriangle, Sparkles } from 'lucide-react'

interface DeliveryPredictionProps {
  orders: Order[]
}

const confidenceColors = {
  high: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  low: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
}

export function DeliveryPrediction({ orders }: DeliveryPredictionProps) {
  const t = useTranslations('prediction')
  const tc = useTranslations('common')
  const [vehicleType, setVehicleType] = useState('')
  const [model, setModel] = useState('')
  const [country, setCountry] = useState('')
  const [drive, setDrive] = useState('')
  const [orderDate, setOrderDate] = useState('')

  const modelOptions = useMemo(() => {
    if (vehicleType === 'Model Y') return MODEL_Y_TRIMS
    if (vehicleType === 'Model 3') return MODEL_3_TRIMS
    return []
  }, [vehicleType])

  const prediction: PredictionType | null = useMemo(() => {
    if (!vehicleType) return null
    const opt = (v: string) => v && v !== '_any' ? v : undefined
    return predictDelivery(orders, vehicleType, opt(model), opt(country), opt(drive), orderDate || undefined)
  }, [orders, vehicleType, model, country, drive, orderDate])

  // Days the user has been waiting since their orderDate (only when they entered one)
  const currentWaitingDays = useMemo(() => {
    const parsed = orderDate ? parseGermanDate(orderDate) : null
    if (!parsed) return null
    return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 86_400_000))
  }, [orderDate])

  const exceedsPessimistic =
    prediction !== null &&
    currentWaitingDays !== null &&
    currentWaitingDays > prediction.pessimisticDays

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Select value={vehicleType} onValueChange={(v) => { setVehicleType(v); setModel('') }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('selectVehicle')} />
          </SelectTrigger>
          <SelectContent position="popper">
            {VEHICLE_TYPES.map(vt => (
              <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={model} onValueChange={setModel} disabled={!vehicleType}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('selectModel')} />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="_any">{tc('all')}</SelectItem>
            {modelOptions.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('selectCountry')} />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="_any">{tc('all')}</SelectItem>
            {COUNTRIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={drive} onValueChange={setDrive}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('selectDrive')} />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="_any">{tc('all')}</SelectItem>
            {DRIVES.map(d => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          type="text"
          placeholder={t('orderDatePlaceholder')}
          value={orderDate}
          onChange={(e) => setOrderDate(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {prediction ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={confidenceColors[prediction.confidence]}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  {t(`confidence.${prediction.confidence}`)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {prediction.recencyWindowDays
                    ? t('basedOnRecent', { count: prediction.sampleSize, days: prediction.recencyWindowDays })
                    : t('basedOn', { count: prediction.sampleSize })}
                </span>
              </div>
              {prediction.confidence === 'low' && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t('lowDataHint')}
                </p>
              )}
              {exceedsPessimistic && (
                <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20 p-2.5">
                  <p className="text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{t('exceedsPessimisticHint', { days: currentWaitingDays! })}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-green-50 dark:bg-green-900/10 p-3 text-center">
                <Zap className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground mb-1">{t('optimistic')}</p>
                <p className="text-lg font-bold tabular-nums">{prediction.optimisticDays} {tc('days')}</p>
                <p className="text-xs text-muted-foreground">{prediction.optimisticDate}</p>
              </div>
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 text-center">
                <Clock className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground mb-1">{t('expected')}</p>
                <p className="text-xl font-bold tabular-nums text-primary">{prediction.expectedDays} {tc('days')}</p>
                <p className="text-xs text-muted-foreground">{prediction.expectedDate}</p>
              </div>
              <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/10 p-3 text-center">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground mb-1">{t('pessimistic')}</p>
                <p className="text-lg font-bold tabular-nums">{prediction.pessimisticDays} {tc('days')}</p>
                <p className="text-xs text-muted-foreground">{prediction.pessimisticDate}</p>
              </div>
            </div>
          </motion.div>
        ) : vehicleType ? (
          <motion.p
            key="no-data"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground text-center py-4"
          >
            {t('notEnoughData')}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
