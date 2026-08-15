'use client'

import { useMemo } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { Order } from '@/lib/types'
import { getHeroFigures } from '@/lib/hero-figures'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'

interface HeroSectionProps {
  orders: Order[]
  onSearchOpen: () => void
  onNewOrder: () => void
}

/**
 * The page opens with the answer, not with its own name.
 *
 * It used to lead with "Tesla Orders and Statistics" and a subtitle — a heading
 * that repeated the logo two centimetres above it and answered nothing. Anyone
 * arriving here wants to know how long people are waiting, and had to scroll
 * past the headline, the filters and a statistics heading to find out. The site
 * description moved to the metadata, where it does the SEO job it was doing
 * anyway.
 *
 * The bar underneath answers the question that always comes second: of everyone
 * still waiting, how many already have a VIN.
 */
export function HeroSection({ orders, onSearchOpen, onNewOrder }: HeroSectionProps) {
  const t = useTranslations('hero')
  const th = useTranslations('home')
  const format = useFormatter()

  const figures = useMemo(() => getHeroFigures(orders), [orders])
  const { total, delivered, waitingWithVin, waitingWithoutVin, stale, medianWaitDays, longOpenWaitDays } = figures
  const waiting = waitingWithVin + waitingWithoutVin
  const deliveredShare = total > 0 ? Math.round((delivered / total) * 100) : 0
  const n = (value: number) => format.number(value)

  return (
    <section className="py-4 sm:py-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-kicker">
            {t('kicker')}
          </p>

          {medianWaitDays !== null ? (
            <h1 className="mt-2 max-w-[15ch] text-[30px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-5xl">
              {t.rich('claim', {
                days: medianWaitDays,
                // The number is the claim; it carries the waiting tone so it
                // reads as a measurement rather than as a headline word.
                em: (chunks) => <em className="not-italic text-pending tabular-nums">{chunks}</em>,
              })}
            </h1>
          ) : (
            <h1 className="mt-2 text-[30px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-5xl">
              {th('titleShort')}
            </h1>
          )}

          {medianWaitDays !== null && (
            <p className="mt-3 max-w-[46ch] text-sm leading-6 text-muted-foreground">
              {t('claimSub', {
                delivered: n(delivered),
                waiting: n(waiting),
                longest: longOpenWaitDays ?? 0,
              })}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:items-end">
          <div className="flex gap-6">
            <div className="text-left lg:text-right">
              <span className="block text-xl font-bold tabular-nums tracking-tight">{n(total)}</span>
              <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t('ordersLabel')}
              </span>
            </div>
            <div className="text-left lg:text-right">
              <span className="block text-xl font-bold tabular-nums tracking-tight">{deliveredShare}&nbsp;%</span>
              <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t('deliveredLabel')}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button size="lg" onClick={onSearchOpen} className="h-11 gap-2 text-base sm:text-sm">
              <Search className="h-4 w-4" />
              {t('findMyOrder')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onNewOrder}
              className="h-11 gap-2 bg-card text-base shadow-sm sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              {th('newOrder')}
            </Button>
          </div>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-6">
          <div className="flex h-1.5 gap-[2px] overflow-hidden rounded-full">
            <span className="bg-success" style={{ flex: delivered || 0.0001 }} />
            <span className="bg-pending" style={{ flex: waitingWithVin || 0.0001 }} />
            <span className="bg-muted-foreground/25" style={{ flex: waitingWithoutVin || 0.0001 }} />
            {/* Shown rather than dropped: without this segment the bar covers
                fewer orders than the count above it claims, and quietly. */}
            {stale > 0 && <span className="bg-muted-foreground/10" style={{ flex: stale }} />}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-success" />
              {n(delivered)} {t('deliveredLabel')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-pending" />
              {t('withVin', { count: n(waitingWithVin) })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-muted-foreground/25" />
              {t('withoutVin', { count: n(waitingWithoutVin) })}
            </span>
            {stale > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-[2px] bg-muted-foreground/10" />
                {t('stale', { count: n(stale) })}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
