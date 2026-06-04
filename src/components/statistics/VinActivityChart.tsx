'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Order } from '@/lib/types'
import { calculateVinActivity } from '@/lib/prediction'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Hash, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface VinActivityChartProps {
  orders: Order[]
}

export function VinActivityChart({ orders }: VinActivityChartProps) {
  const t = useTranslations('vinActivity')

  const activity = useMemo(() => calculateVinActivity(orders), [orders])

  if (!activity) return null

  const TrendIcon = activity.trend === 'up' ? TrendingUp : activity.trend === 'down' ? TrendingDown : Minus

  const trendBadgeClass = activity.trend === 'up'
    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400'
    : activity.trend === 'down'
      ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-muted text-muted-foreground'

  return (
    <Card className="relative shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Hash className="h-4 w-4 text-primary" />
            </div>
            {t('title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={trendBadgeClass}>
              <TrendIcon className="h-3 w-3 mr-1" />
              {activity.trendPercent}%
            </Badge>
            <span className="text-sm font-medium tabular-nums">
              {activity.thisWeek} {t('thisWeek')}
            </span>
          </div>
        </div>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activity.weeklyData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                formatter={(value) => [`${value} VINs`, t('assigned')]}
              />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <span className="absolute bottom-2 right-3 text-[9px] opacity-[0.15] text-foreground select-none pointer-events-none">tff-order-stats.de</span>
    </Card>
  )
}
