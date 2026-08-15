'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { OrderStatistics, SegmentStats } from '@/lib/statistics'
import { ChevronDown } from 'lucide-react'

interface DeliveryTimelineProps {
  stats: OrderStatistics
}

interface Segment {
  days: number | null
}

export function DeliveryTimeline({ stats }: DeliveryTimelineProps) {
  const t = useTranslations('statistics')
  const tc = useTranslations('common')
  const [detailOpen, setDetailOpen] = useState(false)

  const nodes = [
    { label: t('timelineOrder') },
    { label: t('timelineVin') },
    { label: t('timelineProduction') },
    { label: t('timelinePapers') },
    { label: t('timelineDelivery') },
  ]

  const segments: Segment[] = [
    { days: stats.avgOrderToVin },
    { days: stats.avgVinToProduction },
    { days: stats.avgProductionToPapers },
    { days: stats.avgPapersToDelivery },
  ]

  const detailSegments: { label: string; segment: SegmentStats }[] = [
    { label: `${t('timelineOrder')} → ${t('timelineVin')}`, segment: stats.segmentOrderToVin },
    { label: `${t('timelineVin')} → ${t('timelineProduction')}`, segment: stats.segmentVinToProduction },
    { label: `${t('timelineProduction')} → ${t('timelinePapers')}`, segment: stats.segmentProductionToPapers },
    { label: `${t('timelinePapers')} → ${t('timelineDelivery')}`, segment: stats.segmentPapersToDelivery },
  ]

  const formatDays = (days: number | null) =>
    days !== null ? `${days} ${tc('days')}` : '–'

  const formatDaysShort = (days: number | null) =>
    days !== null ? `${days}` : '–'

  const hasDetailData = detailSegments.some(s => s.segment.count > 0)

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">{t('deliveryPipeline')}</h2>

      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-center justify-between gap-0">
        {nodes.map((node, i) => (
          <div key={node.label} className="flex items-center flex-1 last:flex-none">
            {/* Node */}
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-pending bg-pending/20" />
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{node.label}</span>
            </div>
            {/* Segment arrow */}
            {i < segments.length && (
              <div className="flex-1 flex flex-col items-center mx-1 min-w-[60px]">
                <span className="text-xs font-semibold tabular-nums text-foreground">{formatDays(segments[i].days)}</span>
                <div className="w-full flex items-center">
                  <div className="h-0.5 flex-1 bg-pending/30" />
                  <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-primary/50" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: vertical */}
      <div className="sm:hidden space-y-0">
        {nodes.map((node, i) => (
          <div key={node.label}>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 shrink-0 rounded-full border-2 border-pending bg-pending/20" />
              <span className="text-xs font-medium text-muted-foreground">{node.label}</span>
            </div>
            {i < segments.length && (
              <div className="flex items-center gap-3 ml-[5px] my-1">
                <div className="h-6 w-0.5 bg-pending/30" />
                <span className="text-xs font-semibold tabular-nums">{formatDays(segments[i].days)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Total waiting time — sum of segment averages for consistency */}
      {(() => {
        const segmentAvgs = segments.map(s => s.days).filter((d): d is number => d !== null)
        if (segmentAvgs.length === 0) return null
        const total = segmentAvgs.reduce((sum, d) => sum + d, 0)
        return (
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{t('totalWaitTime')}</span>
            <span className="text-sm font-bold tabular-nums">{formatDays(total)}</span>
          </div>
        )
      })()}

      {/* Detail section with min/max */}
      {hasDetailData && (
        <div className="mt-3">
          <button
            onClick={() => setDetailOpen(!detailOpen)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${detailOpen ? 'rotate-180' : ''}`} />
            {t('pipelineDetail')}
          </button>

          {detailOpen && (
            <div className="mt-3 space-y-0">
              {/* Header */}
              <div className="grid grid-cols-[1fr_repeat(3,_minmax(0,_auto))] gap-x-3 sm:gap-x-4 px-2 pb-1.5 border-b border-border/50">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('pipelineSegment')}</span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-right">Ø</span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-right">Min</span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-right">Max</span>
              </div>
              {/* Rows */}
              {detailSegments.map((item) => {
                if (item.segment.count === 0) return null
                return (
                  <div
                    key={item.label}
                    className="grid grid-cols-[1fr_repeat(3,_minmax(0,_auto))] gap-x-3 sm:gap-x-4 px-2 py-1.5"
                  >
                    <span className="text-xs text-muted-foreground truncate">{item.label}</span>
                    <span className="text-xs tabular-nums text-right text-foreground">{formatDaysShort(item.segment.avg)}</span>
                    <span className="text-xs tabular-nums text-right text-success">{formatDaysShort(item.segment.min)}</span>
                    <span className="text-xs tabular-nums text-right text-red-500 dark:text-red-400">{formatDaysShort(item.segment.max)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
