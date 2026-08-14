'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_SERIES_COLOR } from '@/lib/chart-colors'

interface CountryDistributionChartProps {
  data: { name: string; count: number; fill: string }[]
}

export function CountryDistributionChart({ data }: CountryDistributionChartProps) {
  const t = useTranslations('statistics')
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        {t('noDataAvailable')}
      </div>
    )
  }

  // Dynamic height: 35px per bar, minimum 200px, maximum 400px
  const chartHeight = Math.min(400, Math.max(200, data.length * 35))

  // Size the YAxis label gutter to the longest label so long names (e.g. delivery
  // locations like "München-Parsdorf") don't collide with the bars.
  // ~9px per char at text-xs to cover wide caps + umlauts; clamped to [90, 200].
  const MAX_LABEL_CHARS = 22
  const truncate = (s: string) => (s.length > MAX_LABEL_CHARS ? s.slice(0, MAX_LABEL_CHARS - 1) + '…' : s)
  const longest = data.reduce((m, d) => Math.max(m, truncate(d.name).length), 0)
  const yAxisWidth = Math.min(200, Math.max(90, longest * 9 + 10))

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
      style={{ height: chartHeight }}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <XAxis
            type="number"
            className="text-xs"
            tick={{ className: 'fill-foreground' }}
            tickLine={{ className: 'stroke-muted-foreground' }}
            axisLine={{ className: 'stroke-muted-foreground' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            className="text-xs"
            tick={{ className: 'fill-foreground' }}
            tickLine={{ className: 'stroke-muted-foreground' }}
            axisLine={{ className: 'stroke-muted-foreground' }}
            width={yAxisWidth}
            tickFormatter={truncate}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--foreground)',
            }}
            itemStyle={{
              color: 'var(--foreground)',
            }}
            labelStyle={{
              color: 'var(--foreground)',
              fontWeight: 600,
            }}
            formatter={(value) => [t('ordersCount', { value: String(value) }), t('count')]}
          />
          {/* One colour on purpose: every bar already carries its name on the
              y-axis, so a second hue per row encodes nothing and would spend
              the categorical palette on decoration. */}
          <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={CHART_SERIES_COLOR} animationDuration={400} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
