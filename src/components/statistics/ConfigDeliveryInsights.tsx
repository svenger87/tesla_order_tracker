'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Order } from '@/lib/types'
import { calculateConfigInsights } from '@/lib/prediction'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Zap } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_SERIES_COLOR, CHART_TOOLTIP_STYLE } from '@/lib/chart-colors'

interface ConfigDeliveryInsightsProps {
  orders: Order[]
}

export function ConfigDeliveryInsights({ orders }: ConfigDeliveryInsightsProps) {
  const t = useTranslations('speed')
  const tc = useTranslations('common')
  const [dimension, setDimension] = useState<'model' | 'color' | 'drive' | 'country'>('model')

  const insight = useMemo(() => calculateConfigInsights(orders, dimension), [orders, dimension])

  if (insight.values.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          {t('noData')}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Select value={dimension} onValueChange={(v) => setDimension(v as typeof dimension)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="model">{t('byModel')}</SelectItem>
            <SelectItem value="color">{t('byColor')}</SelectItem>
            <SelectItem value="drive">{t('byDrive')}</SelectItem>
            <SelectItem value="country">{t('byCountry')}</SelectItem>
          </SelectContent>
        </Select>
        {insight.values.length > 0 && (
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Zap className="h-3 w-3 mr-1" />
              {t('fastest')}: {insight.values[0].name} ({insight.values[0].medianDays}d)
            </Badge>
          </div>
        )}
      </div>

      {insight.values.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            {t('fastest')}: {insight.values[0].name} — Median {insight.values[0].medianDays} {tc('days')}
          </p>
        </div>
      )}

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={insight.values} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: tc('days'), position: 'insideBottom', style: { fontSize: 11 } }} />
            <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
            <Tooltip
              {...CHART_TOOLTIP_STYLE}
              formatter={(value) => [`${value} ${tc('days')}`, t('medianWait')]}
            />
            {/* One colour: the bar length already carries the wait, and the row
                label already says which config it belongs to. */}
            <Bar dataKey="medianDays" radius={[0, 4, 4, 0]} fill={CHART_SERIES_COLOR} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
