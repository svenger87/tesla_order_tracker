'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Order } from '@/lib/types'
import { parseGermanDate } from '@/lib/date-utils'
import { differenceInDays } from 'date-fns'
import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import { Medal } from 'lucide-react'

interface VeteransListProps {
  orders: Order[]
  limit?: number
}

export function VeteransList({ orders, limit = 10 }: VeteransListProps) {
  const tc = useTranslations('common')

  const veterans = useMemo(() => {
    const today = new Date()
    return orders
      .filter(o => !o.deliveryDate && o.orderDate)
      .map(o => {
        const orderDate = parseGermanDate(o.orderDate)
        const waitingDays = orderDate ? differenceInDays(today, orderDate) : 0
        return { ...o, waitingDays }
      })
      .filter(o => o.waitingDays > 0)
      .sort((a, b) => b.waitingDays - a.waitingDays)
      .slice(0, limit)
  }, [orders, limit])

  if (veterans.length === 0) return null

  const medalColors = [
    'text-yellow-500',   // Gold
    'text-gray-400',     // Silver
    'text-amber-700',    // Bronze
  ]

  return (
    <div className="space-y-2">
      {veterans.map((order, i) => (
        <div
          key={order.id}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <span className="w-6 text-center shrink-0">
            {i < 3 ? (
              <Medal className={`h-4 w-4 ${medalColors[i]}`} />
            ) : (
              <span className="text-xs text-muted-foreground font-mono">{i + 1}</span>
            )}
          </span>
          <Link
            href={`/track/${encodeURIComponent(order.name)}`}
            className="font-medium text-sm hover:text-primary transition-colors hover:underline underline-offset-2 truncate"
          >
            {order.name}
          </Link>
          <Badge variant="outline" className="text-xs ml-auto shrink-0">
            {{ 'Model Y': 'MY', 'Model 3': 'M3', 'Model S': 'MS', 'Model X': 'MX', 'Cybertruck': 'CT', 'Roadster': 'R' }[order.vehicleType] || order.vehicleType}
          </Badge>
          <span className="text-sm font-mono font-semibold tabular-nums shrink-0">
            {order.waitingDays}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {tc('days')}
          </span>
        </div>
      ))}
    </div>
  )
}
