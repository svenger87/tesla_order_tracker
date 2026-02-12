'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface RangeDistributionChartProps {
  data: { name: string; count: number; fill: string }[]
}

const COLORS = [
  'oklch(0.65 0.15 220)',  // Blue (chart-2)
  'oklch(0.70 0.12 160)',  // Teal (chart-3)
  'oklch(0.75 0.15 80)',   // Yellow (chart-4)
  'oklch(0.60 0.18 280)',  // Purple (chart-5)
  'oklch(0.50 0.10 0)',    // Gray for "Andere"
]

export function RangeDistributionChart({ data }: RangeDistributionChartProps) {
  const total = useMemo(() =>
    data.reduce((sum, item) => sum + item.count, 0),
    [data]
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
      <ResponsiveContainer width="100%" height="100%">
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
                fill={entry.fill || COLORS[index % COLORS.length]}
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
