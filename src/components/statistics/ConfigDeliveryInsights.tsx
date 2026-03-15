'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Order } from '@/lib/types'
import { calculateConfigInsights } from '@/lib/prediction'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Cell,
} from 'recharts'

interface ConfigDeliveryInsightsProps {
  orders: Order[]
}

function getDaysColor(days: number, min: number, max: number): string {
  if (max === min) return 'oklch(0.65 0.15 160)'
  const ratio = (days - min) / (max - min)
  if (ratio < 0.33) return 'oklch(0.65 0.15 160)' // green-ish
  if (ratio < 0.66) return 'oklch(0.7 0.15 80)' // yellow-ish
  return 'oklch(0.55 0.22 25)' // red (primary)
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

  const minDays = Math.min(...insight.values.map(v => v.medianDays))
  const maxDays = Math.max(...insight.values.map(v => v.medianDays))

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
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
              formatter={(value) => [`${value} ${tc('days')}`, t('medianWait')]}
            />
            <Bar dataKey="medianDays" radius={[0, 4, 4, 0]}>
              {insight.values.map((entry, index) => (
                <Cell key={index} fill={getDaysColor(entry.medianDays, minDays, maxDays)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
