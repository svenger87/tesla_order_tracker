'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { CHART_AXIS_LINE, CHART_AXIS_TICK, CHART_BAR_CURSOR, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from '@/lib/chart-colors'

interface VinWeekdayChartProps {
  data: { dayOfWeek: number; count: number }[]
}

export function VinWeekdayChart({ data }: VinWeekdayChartProps) {
  const t = useTranslations('statistics')
  const locale = useLocale()
  const totalVins = data.reduce((sum, d) => sum + d.count, 0)

  const formatWeekday = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    return (dayOfWeek: number) => fmt.format(new Date(2025, 0, 5 + dayOfWeek))
  }, [locale])

  if (totalVins < 5) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        {t('notEnoughVinData')}
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
            <linearGradient id="vinWeekdayGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.55 0.18 260)" stopOpacity={1} />
              <stop offset="100%" stopColor="oklch(0.55 0.18 260)" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="dayOfWeek"
            tick={CHART_AXIS_TICK}
            tickLine={CHART_AXIS_LINE}
            axisLine={CHART_AXIS_LINE}
            tickFormatter={formatWeekday}
            interval={0}
          />
          <YAxis
            tick={CHART_AXIS_TICK}
            tickLine={CHART_AXIS_LINE}
            axisLine={CHART_AXIS_LINE}
            allowDecimals={false}
          />
          <Tooltip
            {...CHART_TOOLTIP_STYLE}
            formatter={(value) => [t('vinWeekdayCount', { value: String(value) }), t('count')]}
            labelFormatter={(label) => formatWeekday(label as number)}
            cursor={CHART_BAR_CURSOR}
          />
          <Bar
            dataKey="count"
            fill="url(#vinWeekdayGradient)"
            radius={[4, 4, 0, 0]}
            animationDuration={400}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
