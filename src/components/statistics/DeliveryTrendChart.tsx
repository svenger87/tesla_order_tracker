'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Order } from '@/lib/types'
import { calculateDeliveryTrend } from '@/lib/prediction'
import { useMonthKeyFormatter } from '@/hooks/useMonthKeyFormatter'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DeliveryTrendChartProps {
  orders: Order[]
}

export function DeliveryTrendChart({ orders }: DeliveryTrendChartProps) {
  const t = useTranslations('trend')
  const tc = useTranslations('common')
  const formatMonth = useMonthKeyFormatter()

  const trend = useMemo(() => calculateDeliveryTrend(orders), [orders])

  if (!trend || trend.monthlyAverages.length < 3) return null

  const trendIcon = trend.currentTrend === 'accelerating' ? TrendingDown
    : trend.currentTrend === 'decelerating' ? TrendingUp : Minus
  const TrendIcon = trendIcon

  const trendColor = trend.currentTrend === 'accelerating'
    ? 'text-green-600 dark:text-green-400'
    : trend.currentTrend === 'decelerating'
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground'

  const trendBadgeClass = trend.currentTrend === 'accelerating'
    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400'
    : trend.currentTrend === 'decelerating'
      ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-muted text-muted-foreground'

  return (
    <Card className="relative shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <TrendIcon className="h-4 w-4 text-primary" />
            </div>
            {t('title')}
          </CardTitle>
          <Badge variant="outline" className={trendBadgeClass}>
            <TrendIcon className={`h-3 w-3 mr-1 ${trendColor}`} />
            {trend.trendChangePercent}% {t(trend.currentTrend)}
          </Badge>
        </div>
        <CardDescription>
          {t('description', { percent: trend.trendChangePercent, direction: t(trend.currentTrend) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend.monthlyAverages}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="monthKey" tick={{ fontSize: 11 }} tickFormatter={formatMonth} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: tc('days'), angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                formatter={(value) => [`${value} ${tc('days')}`, t('avgDeliveryTime')]}
                labelFormatter={formatMonth}
              />
              <Area
                type="monotone"
                dataKey="avgDays"
                stroke="var(--color-primary)"
                fillOpacity={1}
                fill="url(#trendGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <span className="absolute bottom-2 right-3 text-[9px] opacity-[0.15] text-foreground select-none pointer-events-none">tff-order-stats.de</span>
    </Card>
  )
}
