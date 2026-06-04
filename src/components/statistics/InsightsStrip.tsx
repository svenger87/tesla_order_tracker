'use client'

import { useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, CalendarDays, Car, ClipboardList, Clock3, Gauge, Globe2, PackageCheck } from 'lucide-react'
import { Order } from '@/lib/types'
import { calculateOrderInsights, OrderInsights } from '@/lib/order-insights'
import { cn } from '@/lib/utils'

interface InsightsStripProps {
  orders: Order[]
  compact?: boolean
}

function formatDays(days: number | null): string {
  if (days === null) return 'n/a'
  return `${days}d`
}

function InsightTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
  compact = false,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Activity
  tone?: 'neutral' | 'success' | 'warning' | 'data'
  compact?: boolean
}) {
  return (
    <div className={cn(
      'group relative overflow-hidden bg-card transition-colors',
      compact
        ? 'px-3 py-3 sm:rounded-lg sm:border sm:shadow-[var(--shadow-card)]'
        : 'rounded-lg border px-3 py-3 shadow-[var(--shadow-card)]',
      'hover:border-primary/30 hover:bg-card/95',
    )}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className={cn('flex gap-3', compact ? 'items-start sm:justify-between' : 'items-start justify-between')}>
        <div className={cn(
          'shrink-0 rounded-full border p-2 sm:rounded-md sm:p-1.5',
          tone === 'success' && 'border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400',
          tone === 'warning' && 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
          tone === 'data' && 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400',
          tone === 'neutral' && 'border-border bg-muted/40 text-muted-foreground',
        )}>
          <Icon className={cn(compact ? 'h-4 w-4' : 'h-4 w-4')} />
        </div>
        <div className="min-w-0">
          <p className={cn('font-medium text-muted-foreground', compact ? 'text-xs normal-case tracking-normal sm:text-[11px] sm:uppercase sm:tracking-wide' : 'text-[11px] uppercase tracking-wide')}>{label}</p>
          <p className={cn('mt-1 truncate font-semibold tracking-tight tabular-nums', compact ? 'text-2xl sm:text-xl' : 'text-2xl sm:text-xl')}>{value}</p>
          <p className={cn('mt-1 leading-snug text-muted-foreground', compact ? 'line-clamp-1 text-xs' : 'line-clamp-2 text-xs')}>{detail}</p>
        </div>
      </div>
    </div>
  )
}

function buildNarrative(insights: OrderInsights): string {
  if (insights.totalOrders === 0) return 'Noch keine Daten im aktuellen Filter.'
  const vinTrend = insights.vinsThisWeek > insights.vinsPreviousWeek ? 'mehr VINs als letzte Woche' : 'keine stärkere VIN-Welle'
  const wait = insights.medianDeliveryDays !== null ? `${insights.medianDeliveryDays} Tage Median bis Auslieferung` : 'noch kein stabiler Liefermedian'
  return `${wait}; aktuell ${insights.pendingOrders} offen und ${vinTrend}.`
}

export function InsightsStrip({ orders, compact = false }: InsightsStripProps) {
  const [nowMs] = useState(() => Date.now())
  const insights = useMemo(() => calculateOrderInsights(orders, nowMs), [orders, nowMs])

  return (
    <section className={cn(
      'overflow-hidden rounded-xl border bg-[linear-gradient(180deg,var(--card),color-mix(in_oklch,var(--card)_88%,var(--muted)))] shadow-[var(--shadow-card)] backdrop-blur-sm',
      compact ? 'p-0 sm:p-3' : 'p-3',
    )}>
      <div className={cn(
        'mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between',
        compact && 'hidden sm:mb-2 sm:flex',
      )}>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Precision Insights</p>
          <h3 className={cn('text-base font-semibold tracking-tight', compact && 'text-sm sm:text-base')}>
            Was die Community-Daten gerade zeigen
          </h3>
        </div>
        <p className={cn(
          'max-w-xl text-xs leading-relaxed text-muted-foreground',
          compact && 'hidden sm:block',
        )}>
          {buildNarrative(insights)}
        </p>
      </div>

      <div className={cn(
        compact
          ? 'grid grid-cols-2 divide-x divide-y sm:gap-2 sm:divide-x-0 sm:divide-y-0 lg:grid-cols-4'
          : 'grid grid-cols-2 gap-2 xl:grid-cols-4',
      )}>
        {(compact ? [
          {
            label: 'Bestellungen',
            value: insights.totalOrders.toLocaleString('de-DE'),
            detail: 'Gesamt',
            icon: ClipboardList,
            tone: 'neutral' as const,
          },
          {
            label: 'Ø Wartezeit',
            value: formatDays(insights.medianDeliveryDays),
            detail: 'Tage',
            icon: Clock3,
            tone: 'data' as const,
          },
          {
            label: 'Nächste Auslieferung',
            value: insights.nextDeliveryPeriod ?? 'n/a',
            detail: 'Prognose',
            icon: CalendarDays,
            tone: 'warning' as const,
          },
          {
            label: 'Häufigstes Modell',
            value: insights.topVehicle?.label ?? 'n/a',
            detail: insights.topVehicle ? `${insights.topVehicle.share}%` : 'Keine Daten',
            icon: Car,
            tone: 'neutral' as const,
          },
        ] : [
          {
            label: 'Lieferquote',
            value: `${insights.deliveryRate}%`,
            detail: `${insights.deliveredOrders} von ${insights.totalOrders} ausgeliefert`,
            icon: PackageCheck,
            tone: 'success' as const,
          },
          {
            label: 'Median Wartezeit',
            value: formatDays(insights.medianDeliveryDays),
            detail: insights.avgDeliveryDays !== null ? `Ø ${insights.avgDeliveryDays} Tage über gelieferte Bestellungen` : 'Noch keine Lieferdaten',
            icon: Clock3,
            tone: 'data' as const,
          },
          {
            label: 'VIN-Aktivität',
            value: `${insights.vinsThisWeek}`,
            detail: `Vorwoche: ${insights.vinsPreviousWeek} VINs`,
            icon: insights.vinsThisWeek >= insights.vinsPreviousWeek ? ArrowUpRight : ArrowDownRight,
            tone: insights.vinsThisWeek >= insights.vinsPreviousWeek ? 'success' as const : 'neutral' as const,
          },
          {
            label: 'Backlog',
            value: `${insights.pendingOrders}`,
            detail: insights.medianPendingAgeDays !== null ? `Median offen: ${insights.medianPendingAgeDays} Tage` : 'Offene Bestellungen ohne stabilen Median',
            icon: Gauge,
            tone: 'warning' as const,
          },
        ]).map((tile) => (
          <div key={tile.label} className={cn(compact && 'min-w-0')}>
            <InsightTile {...tile} compact={compact} />
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mt-3 grid gap-2 border-t pt-3 md:grid-cols-3">
          <InsightTile
            label="Schnellste Konfig"
            value={insights.fastestConfig ? formatDays(insights.fastestConfig.medianDays) : 'n/a'}
            detail={insights.fastestConfig ? `${insights.fastestConfig.label} · ${insights.fastestConfig.count} Lieferungen` : 'Mind. 3 Lieferungen pro Segment nötig'}
            icon={ArrowDownRight}
            tone="success"
          />
          <InsightTile
            label="Langsamste Konfig"
            value={insights.slowestConfig ? formatDays(insights.slowestConfig.medianDays) : 'n/a'}
            detail={insights.slowestConfig ? `${insights.slowestConfig.label} · ${insights.slowestConfig.count} Lieferungen` : 'Mind. 3 Lieferungen pro Segment nötig'}
            icon={ArrowUpRight}
            tone="warning"
          />
          <InsightTile
            label="Stärkstes Land"
            value={insights.topCountry?.label ?? 'n/a'}
            detail={insights.topCountry ? `${insights.topCountry.count} Bestellungen im aktuellen Filter` : 'Keine Länderangaben'}
            icon={Globe2}
            tone="data"
          />
        </div>
      )}
    </section>
  )
}
