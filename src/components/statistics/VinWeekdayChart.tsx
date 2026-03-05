'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'

interface VinWeekdayChartProps {
  data: { name: string; count: number }[]
}

export function VinWeekdayChart({ data }: VinWeekdayChartProps) {
  const t = useTranslations('statistics')
  const totalVins = data.reduce((sum, d) => sum + d.count, 0)

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
      className="h-[300px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="vinWeekdayGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.55 0.18 260)" stopOpacity={1} />
              <stop offset="100%" stopColor="oklch(0.55 0.18 260)" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="name"
            className="text-xs"
            tick={{ className: 'fill-foreground' }}
            tickLine={{ className: 'stroke-muted-foreground' }}
            axisLine={{ className: 'stroke-muted-foreground' }}
          />
          <YAxis
            className="text-xs"
            tick={{ className: 'fill-foreground' }}
            tickLine={{ className: 'stroke-muted-foreground' }}
            axisLine={{ className: 'stroke-muted-foreground' }}
            allowDecimals={false}
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
            formatter={(value) => [t('vinWeekdayCount', { value: String(value) }), t('count')]}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
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
