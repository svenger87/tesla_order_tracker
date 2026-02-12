'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'

interface OrdersTimelineChartProps {
  data: { month: string; count: number }[]
}

export function OrdersTimelineChart({ data }: OrdersTimelineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Keine Daten verfügbar
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
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="month"
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
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          />
          <Bar
            dataKey="count"
            fill="oklch(0.6 0.2 25)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
