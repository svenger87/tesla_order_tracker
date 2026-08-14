'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { CHART_COLORS } from '@/lib/chart-colors'

interface ModelDistributionChartProps {
  data: { model: string; count: number; fill: string }[]
}

const MAX_ITEMS = 5 // Maximum items before combining into "Andere"

export function ModelDistributionChart({ data }: ModelDistributionChartProps) {
  const t = useTranslations('statistics')
  // Combine small values into "Andere" if more than MAX_ITEMS
  const displayData = useMemo(() => {
    if (data.length <= MAX_ITEMS) return data

    const sortedData = [...data].sort((a, b) => b.count - a.count)
    const topItems = sortedData.slice(0, MAX_ITEMS - 1)
    const otherItems = sortedData.slice(MAX_ITEMS - 1)
    const otherCount = otherItems.reduce((sum, item) => sum + item.count, 0)

    if (otherCount > 0) {
      return [...topItems, { model: t('other'), count: otherCount, fill: 'var(--muted-foreground)' }]
    }
    return topItems
  }, [data, t])

  const total = useMemo(() =>
    displayData.reduce((sum, item) => sum + item.count, 0),
    [displayData]
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
        <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <Pie
            data={displayData}
            cx="50%"
            cy="45%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={3}
            dataKey="count"
            nameKey="model"
          >
            {displayData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
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
              const item = displayData.find(d => d.model === value)
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
