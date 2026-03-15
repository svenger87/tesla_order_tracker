'use client'

import { Order } from '@/lib/types'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Info } from 'lucide-react'

interface SimilarOrdersProps {
  orders: Order[]
  currentOrderId: string
}

export function SimilarOrders({ orders, currentOrderId }: SimilarOrdersProps) {
  const t = useTranslations('tracking')

  const filtered = orders.filter(o => o.id !== currentOrderId)

  if (filtered.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
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
          {filtered.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{order.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                    {order.vehicleType === 'Model Y' ? 'MY' : order.vehicleType === 'Model 3' ? 'M3' : order.vehicleType}
                  </Badge>
                  {order.model && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {order.model}
                    </Badge>
                  )}
                </div>
                {order.orderDate && (
                  <p className="text-xs text-muted-foreground mt-1">{order.orderDate}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                {order.deliveryDate ? (
                  <div>
                    <Badge variant="default" className="bg-green-600 text-white text-[10px] px-1.5 py-0">
                      {order.deliveryDate}
                    </Badge>
                    {order.orderToDelivery != null && (
                      <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                        {order.orderToDelivery}d
                      </p>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {t('pending')}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
