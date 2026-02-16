'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface ModelDistributionChartProps {
  data: { model: string; count: number; fill: string }[]
}

// Colors without hsl() wrapper - direct oklch values
const COLORS = [
  'oklch(0.55 0.22 25)',   // Tesla Red (chart-1)
  'oklch(0.65 0.15 220)',  // Blue (chart-2)
  'oklch(0.70 0.12 160)',  // Teal (chart-3)
  'oklch(0.75 0.15 80)',   // Yellow (chart-4)
  'oklch(0.60 0.18 280)',  // Purple (chart-5)
  'oklch(0.50 0.10 0)',    // Gray for "Andere"
]

const MAX_ITEMS = 5 // Maximum items before combining into "Andere"

export function ModelDistributionChart({ data }: ModelDistributionChartProps) {
  // Combine small values into "Andere" if more than MAX_ITEMS
  const displayData = useMemo(() => {
    if (data.length <= MAX_ITEMS) return data

    const sortedData = [...data].sort((a, b) => b.count - a.count)
    const topItems = sortedData.slice(0, MAX_ITEMS - 1)
    const otherItems = sortedData.slice(MAX_ITEMS - 1)
    const otherCount = otherItems.reduce((sum, item) => sum + item.count, 0)

    if (otherCount > 0) {
      return [...topItems, { model: 'Andere', count: otherCount, fill: COLORS[5] }]
    }
    return topItems
  }, [data])

  const total = useMemo(() =>
    displayData.reduce((sum, item) => sum + item.count, 0),
    [displayData]
  )

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Keine Daten verfügbar
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
            data={displayData}
            cx="50%"
            cy="45%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={3}
            dataKey="count"
            nameKey="model"
          >
            {displayData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                className="stroke-background stroke-2"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            itemStyle={{
              color: 'hsl(var(--foreground))',
            }}
            labelStyle={{
              color: 'hsl(var(--foreground))',
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
