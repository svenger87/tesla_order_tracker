'use client'

import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface DistributionData {
  name: string
  count: number
  fill: string
}

interface ConfigDistributionChartsProps {
  rangeDistribution: DistributionData[]
  wheelsDistribution: DistributionData[]
  interiorDistribution: DistributionData[]
  autopilotDistribution: DistributionData[]
  driveDistribution: DistributionData[]
  towHitchDistribution: DistributionData[]
  colorDistribution: DistributionData[]
  deliveryLocationDistribution: DistributionData[]
}

const COLORS = [
  'oklch(0.55 0.22 25)',   // Tesla Red
  'oklch(0.65 0.15 220)',  // Blue
  'oklch(0.70 0.12 160)',  // Teal
  'oklch(0.75 0.15 80)',   // Yellow
  'oklch(0.60 0.18 280)',  // Purple
  'oklch(0.70 0.18 140)',  // Green
  'oklch(0.65 0.20 40)',   // Orange
  'oklch(0.58 0.20 340)',  // Pink
  'oklch(0.72 0.14 200)',  // Light Blue
  'oklch(0.68 0.16 120)',  // Lime
  'oklch(0.62 0.18 300)',  // Magenta
  'oklch(0.70 0.12 60)',   // Gold
  'oklch(0.55 0.15 180)',  // Cyan Dark
  'oklch(0.75 0.10 100)',  // Light Yellow
  'oklch(0.60 0.14 240)',  // Indigo
  'oklch(0.68 0.20 20)',   // Coral
]

interface MiniPieChartProps {
  data: DistributionData[]
  title: string
  delay?: number
  maxItems?: number  // Max items before combining into "Andere"
}

export function MiniPieChart({ data, title, delay = 0, maxItems = 6 }: MiniPieChartProps) {
  // Filter out "Unbekannt" if there are other values
  const filteredData = data.filter(d => d.name !== 'Unbekannt' || data.length === 1)

  if (filteredData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
          Keine Daten
        </CardContent>
      </Card>
    )
  }

  // Combine small values into "Andere" if more than maxItems+1
  let displayData = filteredData
  if (filteredData.length > maxItems + 1) {
    const topItems = filteredData.slice(0, maxItems)
    const otherCount = filteredData.slice(maxItems).reduce((sum, item) => sum + item.count, 0)
    displayData = [...topItems, { name: 'Andere', count: otherCount, fill: COLORS[4] }]
  }

  const total = displayData.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card className="h-full min-h-[220px] overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-2 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay }}
          className="h-[180px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={displayData}
                cx="50%"
                cy="40%"
                innerRadius={28}
                outerRadius={50}
                paddingAngle={0}
                dataKey="count"
                nameKey="name"
              >
                {displayData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill || COLORS[index % COLORS.length]}
                    stroke="#71717a"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
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
                  const numValue = typeof value === 'number' ? value : 0
                  const itemName = (props.payload as DistributionData)?.name || ''
                  return [`${numValue} (${((numValue / total) * 100).toFixed(1)}%)`, itemName]
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={50}
                wrapperStyle={{ fontSize: '9px', overflow: 'hidden', maxHeight: '50px' }}
                formatter={(value, entry) => {
                  const count = (entry.payload as DistributionData)?.count || 0
                  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
                  return <span className="text-foreground text-[10px]">{value} ({percentage}%)</span>
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  )
}

export function ConfigDistributionCharts({
  rangeDistribution,
  wheelsDistribution,
  interiorDistribution,
  autopilotDistribution,
  driveDistribution,
  towHitchDistribution,
  colorDistribution,
  deliveryLocationDistribution,
}: ConfigDistributionChartsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <MiniPieChart data={colorDistribution} title="Farbe" delay={0} />
      <MiniPieChart data={rangeDistribution} title="Reichweite" delay={0.05} />
      <MiniPieChart data={wheelsDistribution} title="Felgen" delay={0.1} />
      <MiniPieChart data={interiorDistribution} title="Innenraum" delay={0.15} />
      <MiniPieChart data={driveDistribution} title="Antrieb" delay={0.2} />
      <MiniPieChart data={towHitchDistribution} title="AHK" delay={0.25} />
      <MiniPieChart data={autopilotDistribution} title="Autopilot" delay={0.3} />
      <MiniPieChart data={deliveryLocationDistribution} title="Lieferort" delay={0.35} maxItems={15} />
    </div>
  )
}
