'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CHART_COLORS, MAX_CATEGORICAL_SLOTS } from '@/lib/chart-colors'

export interface DistributionData {
  name: string
  count: number
  fill: string
}

interface MiniPieChartProps {
  data: DistributionData[]
  title: string
  delay?: number
  maxItems?: number  // Max items before combining into "Andere"
}

export function MiniPieChart({ data, title, delay = 0, maxItems = MAX_CATEGORICAL_SLOTS }: MiniPieChartProps) {
  const t = useTranslations('statistics')
  // The caller has already dropped the UNKNOWN_OPTION sentinel and localized
  // every name. The filter that used to sit here compared against the German
  // "Unbekannt", so it never matched in any other language anyway.
  const filteredData = data

  if (filteredData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
          {t('noData')}
        </CardContent>
      </Card>
    )
  }

  // Combine small values into "Andere" if more than maxItems+1
  let displayData = filteredData
  if (filteredData.length > maxItems + 1) {
    const topItems = filteredData.slice(0, maxItems)
    const otherCount = filteredData.slice(maxItems).reduce((sum, item) => sum + item.count, 0)
    displayData = [...topItems, { name: t('other'), count: otherCount, fill: 'var(--muted-foreground)' }]
  }

  const total = displayData.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card className="h-full min-h-[280px] overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-2 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay }}
          className="h-[240px]"
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <Pie
                data={displayData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                paddingAngle={0}
                dataKey="count"
                nameKey="name"
                animationDuration={400}
              >
                {displayData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill || CHART_COLORS[index]}
                    stroke="#71717a"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--foreground)',
                }}
                itemStyle={{
                  color: 'var(--foreground)',
                }}
                labelStyle={{
                  color: 'var(--foreground)',
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
                height={80}
                wrapperStyle={{ fontSize: '11px', overflow: 'hidden', maxHeight: '90px', paddingTop: '4px' }}
                formatter={(value, entry) => {
                  const count = (entry.payload as DistributionData)?.count || 0
                  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
                  const truncatedValue = typeof value === 'string' && value.length > 16 ? value.slice(0, 16) + '…' : value
                  return <span className="text-foreground text-xs">{truncatedValue} ({percentage}%)</span>
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  )
}
