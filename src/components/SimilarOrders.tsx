'use client'

import { Order, MODEL_Y_TRIMS, MODEL_3_TRIMS, MODEL_S_TRIMS, MODEL_X_TRIMS, CYBERTRUCK_TRIMS, ROADSTER_TRIMS } from '@/lib/types'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronRight, Info } from 'lucide-react'

interface SimilarOrdersProps {
  orders: Order[]
  currentOrderId: string
}

const TRIMS = [...MODEL_Y_TRIMS, ...MODEL_3_TRIMS, ...MODEL_S_TRIMS, ...MODEL_X_TRIMS, ...CYBERTRUCK_TRIMS, ...ROADSTER_TRIMS]

const VEHICLE_SHORT: Record<string, string> = {
  'Model Y': 'MY', 'Model 3': 'M3', 'Model S': 'MS', 'Model X': 'MX', Cybertruck: 'CT', Roadster: 'R',
}

/** The trim's display name; the stored value is a lowercase key ("performance"). */
function trimLabel(value: string): string {
  return TRIMS.find(t => t.value === value || t.label === value)?.label ?? value
}

export function SimilarOrders({ orders, currentOrderId }: SimilarOrdersProps) {
  const t = useTranslations('tracking')

  const filtered = orders.filter(o => o.id !== currentOrderId)

  if (filtered.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('similarOrders')}</CardTitle>
        {filtered.length < 3 && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {t('fewSimilar')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((order) => {
            // A duration below zero means the entry's dates are inconsistent
            // (delivered before it was ordered); showing "-240d" helps nobody.
            const days = order.orderToDelivery != null && order.orderToDelivery >= 0 ? order.orderToDelivery : null
            return (
              // The cards always had a hover state; now they also go somewhere.
              <Link
                key={order.id}
                href={`/track/${encodeURIComponent(order.name)}`}
                className="group flex items-center justify-between gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium group-hover:text-primary">{order.name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {order.vehicleType && (
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                        {VEHICLE_SHORT[order.vehicleType] ?? order.vehicleType}
                      </Badge>
                    )}
                    {order.model && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                        {trimLabel(order.model)}
                      </Badge>
                    )}
                  </div>
                  {order.orderDate && (
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {t('orderDate')} {order.orderDate}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {order.deliveryDate ? (
                    <>
                      <p className="text-[11px] text-muted-foreground">{t('delivered')}</p>
                      <p className="text-xs font-medium tabular-nums text-success">{order.deliveryDate}</p>
                      {days != null && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                          {days} {t('daysUnit')}
                        </p>
                      )}
                    </>
                  ) : (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      {t('pending')}
                    </Badge>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
