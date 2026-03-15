'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Order, VEHICLE_TYPES, MODEL_Y_TRIMS, MODEL_3_TRIMS, DRIVES, COUNTRIES } from '@/lib/types'
import { predictDelivery, DeliveryPrediction as PredictionType } from '@/lib/prediction'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calculator, Zap, Clock, AlertTriangle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

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
  const [isExpanded, setIsExpanded] = useState(false)

  const modelOptions = useMemo(() => {
    if (vehicleType === 'Model Y') return MODEL_Y_TRIMS
    if (vehicleType === 'Model 3') return MODEL_3_TRIMS
    return []
  }, [vehicleType])

  const prediction: PredictionType | null = useMemo(() => {
    if (!vehicleType) return null
    return predictDelivery(orders, vehicleType, model || undefined, country || undefined, drive || undefined, orderDate || undefined)
  }, [orders, vehicleType, model, country, drive, orderDate])

  return (
    <Card className="relative overflow-hidden border-primary/20 shadow-[var(--shadow-card)]">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Calculator className="h-4 w-4 text-primary" />
            </div>
            {t('title')}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="space-y-4 pt-0">
              {/* Form */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <Select value={vehicleType} onValueChange={(v) => { setVehicleType(v); setModel('') }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectVehicle')} />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map(vt => (
                      <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={model} onValueChange={setModel} disabled={!vehicleType}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectModel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_any">{tc('all')}</SelectItem>
                    {modelOptions.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCountry')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_any">{tc('all')}</SelectItem>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={drive} onValueChange={setDrive}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectDrive')} />
                  </SelectTrigger>
                  <SelectContent>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={confidenceColors[prediction.confidence]}>
                        <Sparkles className="h-3 w-3 mr-1" />
                        {t(`confidence.${prediction.confidence}`)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t('basedOn', { count: prediction.sampleSize })}
                      </span>
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
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
