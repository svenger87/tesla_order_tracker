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
}

/**
 * Comparable orders, as a comparison.
 *
 * This was eight cards each carrying a vehicle badge and a trim badge — both
 * identical on every card, because the orders are comparable by definition, so
 * the badges said nothing and the brand red said it eight times. What actually
 * differs is the wait, and that was the smallest thing on the row. It is now a
 * ranked list with a bar, which is the only reason to show these at all: to see
 * where your own wait sits among them.
 */
export function SimilarOrders({ orders, currentOrderId, ownWaitDays }: SimilarOrdersProps) {
  const t = useTranslations('tracking')

  const rows = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return orders
      .filter(o => o.id !== currentOrderId)
      .map(o => {
        const from = parseGermanDate(o.orderDate)
        const to = parseGermanDate(o.deliveryDate)
        const delivered = Boolean(to && to.getTime() <= today.getTime())
        return {
          id: o.id,
          name: o.name,
          orderDate: o.orderDate,
          delivered,
          waitDays: from ? Math.round(((delivered && to ? to : today).getTime() - from.getTime()) / 86_400_000) : null,
        }
      })
      .sort((a, b) => (a.waitDays ?? Infinity) - (b.waitDays ?? Infinity))
  }, [orders, currentOrderId])

  if (rows.length === 0) return null

  const longest = Math.max(...rows.map(r => r.waitDays ?? 0), ownWaitDays ?? 0, 1)

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
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 bg-card px-3 py-2.5"
            >
              <span className="min-w-0 truncate text-sm font-medium">{row.name}</span>
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
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn('block h-full rounded-full', row.delivered ? 'bg-success' : 'bg-pending')}
                    style={{ width: `${Math.round(((row.waitDays ?? 0) / longest) * 100)}%` }}
                  />
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {row.delivered ? row.orderDate : t('pending')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
