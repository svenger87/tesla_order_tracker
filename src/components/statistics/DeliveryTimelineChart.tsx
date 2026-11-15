'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { CHART_AXIS_LINE, CHART_AXIS_TICK, CHART_BAR_CURSOR, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from '@/lib/chart-colors'
import { useMonthKeyFormatter } from '@/hooks/useMonthKeyFormatter'
import { clampToCurrentMonth } from './chart-utils'

interface DeliveryTimelineChartProps {
  data: { month: string; count: number }[]
}

export function DeliveryTimelineChart({ data: rawData }: DeliveryTimelineChartProps) {
  const t = useTranslations('statistics')
  const formatMonth = useMonthKeyFormatter()
  const data = clampToCurrentMonth(rawData, d => d.month)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        {t('noDeliveriesAvailable')}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-[300px] w-full [&_:focus:not(:focus-visible)]:outline-none"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
        >
          <defs>
            <linearGradient id="deliveriesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.65 0.15 160)" stopOpacity={1} />
              <stop offset="100%" stopColor="oklch(0.65 0.15 160)" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="month"
            tick={CHART_AXIS_TICK}
            tickLine={CHART_AXIS_LINE}
            axisLine={CHART_AXIS_LINE}
            tickFormatter={formatMonth}
          />
          <YAxis
            tick={CHART_AXIS_TICK}
            tickLine={CHART_AXIS_LINE}
            axisLine={CHART_AXIS_LINE}
          />
          <Tooltip
            {...CHART_TOOLTIP_STYLE}
            formatter={(value) => [t('deliveriesCount', { value: String(value) }), t('count')]}
            labelFormatter={(label) => formatMonth(label as string)}
            cursor={CHART_BAR_CURSOR}
          />
          <Bar
            dataKey="count"
            fill="url(#deliveriesGradient)"
            radius={[4, 4, 0, 0]}
            animationDuration={400}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
