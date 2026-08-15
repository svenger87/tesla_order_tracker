'use client'

import { useMemo } from 'react'
import { Order } from '@/lib/types'
import { useTranslations } from 'next-intl'
import { parseGermanDate } from '@/lib/date-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Info } from 'lucide-react'

interface SimilarOrdersProps {
  orders: Order[]
  currentOrderId: string
  /** The wait this list is being compared against, so it can be marked. */
  ownWaitDays?: number | null
  /** Name of the order being viewed, so its row can be found in the ranking. */
  ownName?: string
  /** Whether the viewed order's wait has ended, or is still running. */
  ownDelivered?: boolean
}

/**
 * Comparable orders, as a comparison.
 *
 * This was eight cards each carrying a vehicle badge and a trim badge — both
 * identical on every card, because the orders are comparable by definition, so
 * the badges said nothing and the brand red said it eight times. What actually
 * differs is the wait, and that was the smallest thing on the row.
 *
 * It became a ranked list with a bar, which is the only reason to show these at
 * all: to see where your own wait sits among them. That last part was still
 * missing — the own wait was passed in and used only to scale the bars, never
 * drawn — so the list ranked eight strangers and left the reader to find their
 * own place in it. The viewed order now takes its position in the ranking.
 */
export function SimilarOrders({
  orders,
  currentOrderId,
  ownWaitDays,
  ownName,
  ownDelivered,
}: SimilarOrdersProps) {
  const t = useTranslations('tracking')

  const rows = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const comparable = orders
      .filter(o => o.id !== currentOrderId)
      .map(o => {
        const from = parseGermanDate(o.orderDate)
        const to = parseGermanDate(o.deliveryDate)
        const delivered = Boolean(to && to.getTime() <= today.getTime())
        return {
          id: o.id,
          name: o.name,
          note: o.orderDate,
          isOwn: false,
          delivered,
          waitDays: from ? Math.round(((delivered && to ? to : today).getTime() - from.getTime()) / 86_400_000) : null,
        }
      })

    const own = ownWaitDays !== null && ownWaitDays !== undefined && ownName
      ? [{
          id: currentOrderId,
          name: ownName,
          note: ownDelivered ? t('waitedLabel') : t('waitingLabel'),
          isOwn: true,
          delivered: Boolean(ownDelivered),
          waitDays: ownWaitDays,
        }]
      : []

    return [...comparable, ...own].sort(
      (a, b) => (a.waitDays ?? Infinity) - (b.waitDays ?? Infinity),
    )
  }, [orders, currentOrderId, ownWaitDays, ownName, ownDelivered, t])

  if (rows.length === 0) return null

  const longest = Math.max(...rows.map(r => r.waitDays ?? 0), 1)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('similarOrders')}</CardTitle>
        {rows.length < 3 && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {t('fewSimilar')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ul className="grid gap-px overflow-hidden rounded-lg border bg-border">
          {rows.map(row => (
            <li
              key={row.id}
              className={cn(
                'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-3 py-2.5',
                row.isOwn ? 'bg-primary/5' : 'bg-card',
              )}
            >
              <span className={cn('min-w-0 truncate text-sm', row.isOwn ? 'font-semibold text-primary' : 'font-medium')}>
                {row.name}
              </span>
              <span className="text-right text-sm font-semibold tabular-nums">
                {row.waitDays !== null ? (
                  <>
                    {row.waitDays}
                    <span className="ml-1 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                      {t('daysUnit')}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-normal text-muted-foreground">–</span>
                )}
              </span>

              <span className="col-span-2 flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      'block h-full rounded-full',
                      row.isOwn ? 'bg-primary' : row.delivered ? 'bg-success' : 'bg-pending',
                    )}
                    style={{ width: `${Math.round(((row.waitDays ?? 0) / longest) * 100)}%` }}
                  />
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{row.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
