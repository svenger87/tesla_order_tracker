'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { CHART_AXIS_LINE, CHART_AXIS_TICK, CHART_BAR_CURSOR, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from '@/lib/chart-colors'

interface WaitTimeDistributionChartProps {
  data: { range: string; count: number; min: number; max: number }[]
}

const BAR_COLOR = 'oklch(0.65 0.18 40)'

interface RangeTickProps {
  x?: number | string
  y?: number | string
  payload?: { value: string }
}

/**
 * "121-150" set as two short lines ("121–" over "150"): seven buckets on one
 * line ran into each other on a phone, and recharts' own answer — dropping
 * every other label — hides which bar is which.
 */
function RangeTick({ x = 0, y = 0, payload }: RangeTickProps) {
  const value = payload?.value ?? ''
  const [from, to] = value.split('-')
  return (
    <text x={Number(x)} y={Number(y) + 4} textAnchor="middle" {...CHART_AXIS_TICK}>
      {to === undefined ? (
        <tspan x={Number(x)} dy="0.71em">{value}</tspan>
      ) : (
        <>
          <tspan x={Number(x)} dy="0.71em">{from}–</tspan>
          <tspan x={Number(x)} dy="1.2em">{to}</tspan>
        </>
      )}
    </text>
  )
}

/**
 * A histogram of order-to-delivery days. The buckets are categories (0-30,
 * 31-60, …, 180+), so they are drawn as bars: an area between them implied
 * values on a continuous axis that the data does not have.
 */
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
      className="h-[300px] w-full [&_:focus:not(:focus-visible)]:outline-none"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 8, left: -12, bottom: 16 }}
          barCategoryGap="12%"
        >
          <defs>
            <linearGradient id="colorWaitTime" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BAR_COLOR} stopOpacity={1} />
              <stop offset="100%" stopColor={BAR_COLOR} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="range"
            tick={<RangeTick />}
            height={44}
            tickLine={CHART_AXIS_LINE}
            axisLine={CHART_AXIS_LINE}
            interval={0}
            label={{
              value: tc('days'),
              position: 'insideBottom',
              offset: -10,
              style: { ...CHART_AXIS_TICK },
            }}
          />
          <YAxis
            tick={CHART_AXIS_TICK}
            tickLine={CHART_AXIS_LINE}
            axisLine={CHART_AXIS_LINE}
            allowDecimals={false}
          />
          <Tooltip
            {...CHART_TOOLTIP_STYLE}
            cursor={CHART_BAR_CURSOR}
            labelFormatter={(label) => t('daysRange', { range: String(label) })}
            formatter={(value) => [t('ordersCount', { value: String(value) }), t('count')]}
          />
          <Bar
            dataKey="count"
            fill="url(#colorWaitTime)"
            radius={[4, 4, 0, 0]}
            animationDuration={400}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
