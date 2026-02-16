'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'

interface WaitTimeDistributionChartProps {
  data: { range: string; count: number; min: number; max: number }[]
}

export function WaitTimeDistributionChart({ data }: WaitTimeDistributionChartProps) {
  const t = useTranslations('statistics')
  const tc = useTranslations('common')
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        {t('noWaitTimeData')}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="h-[300px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorWaitTime" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.65 0.18 40)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="oklch(0.65 0.18 40)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="range"
            className="text-xs"
            tick={{ className: 'fill-foreground' }}
            tickLine={{ className: 'stroke-muted-foreground' }}
            axisLine={{ className: 'stroke-muted-foreground' }}
            label={{
              value: tc('days'),
              position: 'insideBottomRight',
              offset: -5,
              className: 'fill-muted-foreground text-xs'
            }}
          />
          <YAxis
            className="text-xs"
            tick={{ className: 'fill-foreground' }}
            tickLine={{ className: 'stroke-muted-foreground' }}
            axisLine={{ className: 'stroke-muted-foreground' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))',
            }}
            itemStyle={{
              color: 'hsl(var(--foreground))',
            }}
            labelStyle={{
              color: 'hsl(var(--foreground))',
              fontWeight: 600,
            }}
            formatter={(value, _name, props) => {
              const item = props.payload
              return [t('ordersCount', { value: String(value) }), t('daysRange', { range: item.range })]
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="oklch(0.65 0.18 40)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorWaitTime)"
            animationDuration={400}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
