'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'

interface CountryDistributionChartProps {
  data: { name: string; count: number; fill: string }[]
}

// 10 unique colors to avoid repeats in Top 10
const COLORS = [
  'oklch(0.6 0.2 25)',    // Red
  'oklch(0.7 0.15 220)',  // Blue
  'oklch(0.72 0.12 160)', // Teal
  'oklch(0.78 0.15 80)',  // Yellow
  'oklch(0.65 0.18 280)', // Purple
  'oklch(0.70 0.18 140)', // Green
  'oklch(0.65 0.20 40)',  // Orange
  'oklch(0.58 0.20 340)', // Pink
  'oklch(0.72 0.14 200)', // Light Blue
  'oklch(0.68 0.16 120)', // Lime
]

export function CountryDistributionChart({ data }: CountryDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Keine Daten verfügbar
      </div>
    )
  }

  // Dynamic height: 35px per bar, minimum 200px, maximum 400px
  const chartHeight = Math.min(400, Math.max(200, data.length * 35))

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
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
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
            width={90}
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
            formatter={(value) => [`${value} Bestellungen`, 'Anzahl']}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} animationDuration={1000} animationEasing="ease-out">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
