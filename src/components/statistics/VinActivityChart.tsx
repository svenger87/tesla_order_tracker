'use client'

import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Order } from '@/lib/types'
import { parseGermanDate } from '@/lib/date-utils'
import {
  CHART_AXIS_LINE,
  CHART_AXIS_TICK,
  CHART_BAR_CURSOR,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
} from '@/lib/chart-colors'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Hash, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface VinActivityChartProps {
  orders: Order[]
}

const WEEKS_SHOWN = 12

function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface WeekBucket {
  key: string
  start: Date
  count: number
  partial: boolean
}

/**
 * VINs assigned per Monday-to-Sunday week, ending with the current week.
 *
 * The headline compares the last two *complete* weeks. It used to set the
 * current week — a day or two old, often a single VIN — against the full week
 * before it, so every Monday the card announced a near-100% collapse. Weeks
 * without a VIN are kept as zeros rather than skipped, so "the week before" is
 * always the calendar week before.
 */
function weeklyVinActivity(orders: Order[], now: Date = new Date()) {
  const currentMonday = mondayOf(now)
  const weeks: WeekBucket[] = []
  for (let i = WEEKS_SHOWN - 1; i >= 0; i--) {
    const start = new Date(currentMonday)
    start.setDate(start.getDate() - i * 7)
    weeks.push({ key: dayKey(start), start, count: 0, partial: i === 0 })
  }
  const byKey = new Map(weeks.map(w => [w.key, w]))

  let total = 0
  for (const o of orders) {
    const date = parseGermanDate(o.vinReceivedDate)
    if (!date || date > now) continue
    total++
    const bucket = byKey.get(dayKey(mondayOf(date)))
    if (bucket) bucket.count++
  }
  if (total < 5) return null

  const lastWeek = weeks[weeks.length - 2].count
  const weekBefore = weeks[weeks.length - 3].count
  const changePercent = weekBefore > 0 ? Math.round(((lastWeek - weekBefore) / weekBefore) * 100) : null
  const trend: 'up' | 'down' | 'stable' =
    changePercent === null ? 'stable' : changePercent >= 10 ? 'up' : changePercent <= -10 ? 'down' : 'stable'

  return { weeks, lastWeek, weekBefore, changePercent, trend }
}

export function VinActivityChart({ orders }: VinActivityChartProps) {
  const t = useTranslations('vinActivity')
  const locale = useLocale()

  const activity = useMemo(() => weeklyVinActivity(orders), [orders])

  const formatWeek = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
    return (d: Date) => fmt.format(d)
  }, [locale])

  if (!activity) return null

  const TrendIcon = activity.trend === 'up' ? TrendingUp : activity.trend === 'down' ? TrendingDown : Minus

  const trendBadgeClass = activity.trend === 'up'
    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400'
    : activity.trend === 'down'
      ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-muted text-muted-foreground'

  const chartData = activity.weeks.map(w => ({ key: w.key, label: formatWeek(w.start), count: w.count, partial: w.partial }))

  return (
    <Card className="relative shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Hash className="h-4 w-4 text-primary" />
            </div>
            {t('title')}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium tabular-nums">
              {t('lastWeek', { count: activity.lastWeek })}
            </span>
            {activity.changePercent !== null && (
              <Badge variant="outline" className={trendBadgeClass}>
                <TrendIcon className="h-3 w-3 mr-1" />
                {activity.changePercent > 0 ? '+' : ''}{activity.changePercent}% {t('vsWeekBefore')}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
        <div className="h-[200px] [&_:focus:not(:focus-visible)]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tick={CHART_AXIS_TICK} tickLine={CHART_AXIS_LINE} axisLine={CHART_AXIS_LINE} />
              <YAxis tick={CHART_AXIS_TICK} tickLine={CHART_AXIS_LINE} axisLine={CHART_AXIS_LINE} allowDecimals={false} />
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                cursor={CHART_BAR_CURSOR}
                labelFormatter={(label, payload) => {
                  const partial = (payload?.[0]?.payload as { partial?: boolean } | undefined)?.partial
                  return partial ? `${t('weekOf', { date: String(label) })} (${t('soFar')})` : t('weekOf', { date: String(label) })
                }}
                formatter={(value) => [`${value} VINs`, t('assigned')]}
              />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]}>
                {chartData.map(d => (
                  <Cell key={d.key} fillOpacity={d.partial ? 0.4 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <span className="absolute bottom-2 right-3 text-[9px] opacity-[0.15] text-foreground select-none pointer-events-none">tff-order-stats.de</span>
    </Card>
  )
}
