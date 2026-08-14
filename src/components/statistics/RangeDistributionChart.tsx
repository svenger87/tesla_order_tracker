'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { CHART_COLORS } from '@/lib/chart-colors'

interface RangeDistributionChartProps {
  data: { name: string; count: number; fill: string }[]
}

export function RangeDistributionChart({ data }: RangeDistributionChartProps) {
  const t = useTranslations('statistics')
  const total = useMemo(() =>
    data.reduce((sum, item) => sum + item.count, 0),
    [data]
  )

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        {t('noDataAvailable')}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="h-[300px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={3}
            dataKey="count"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.fill || CHART_COLORS[index % CHART_COLORS.length]}
                className="stroke-background stroke-2"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
            }}
            itemStyle={{
              color: 'var(--foreground)',
            }}
            labelStyle={{
              color: 'var(--foreground)',
            }}
            formatter={(value) => {
              const numValue = typeof value === 'number' ? value : 0
              return [`${numValue} (${((numValue / total) * 100).toFixed(1)}%)`, '']
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={50}
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => {
              const item = data.find(d => d.name === value)
              const percent = item ? ((item.count / total) * 100).toFixed(1) : '0.0'
              return (
                <span className="text-foreground text-sm">
                  {value} ({percent}%)
                </span>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
