'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Order } from '@/lib/types'
import { parseGermanDate } from '@/lib/date-utils'
import { differenceInDays } from 'date-fns'
import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import { Medal, Shield } from 'lucide-react'
import { useOptions } from '@/hooks/useOptions'

const VETERAN_THRESHOLD = 150

interface VeteransListProps {
  orders: Order[]
  limit?: number
}

export function VeteransList({ orders, limit = 10 }: VeteransListProps) {
  const tc = useTranslations('common')
  const t = useTranslations('home')
  const { models, colors, drives } = useOptions()

  const ranked = useMemo(() => {
    return orders
      .filter(o => o.orderDate && o.deliveryDate)
      .map(o => {
        const orderDate = parseGermanDate(o.orderDate)
        const deliveryDate = parseGermanDate(o.deliveryDate)
        const waitingDays = orderDate && deliveryDate ? differenceInDays(deliveryDate, orderDate) : 0
        return { ...o, waitingDays }
      })
      .filter(o => o.waitingDays > 0)
      .sort((a, b) => b.waitingDays - a.waitingDays)
      .slice(0, limit)
  }, [orders, limit])

  if (ranked.length === 0) return null

  const veterans = ranked.filter(o => o.waitingDays >= VETERAN_THRESHOLD)
  const reservists = ranked.filter(o => o.waitingDays < VETERAN_THRESHOLD)

  const medalColors = [
    'text-yellow-500',
    'text-gray-400',
    'text-amber-700',
  ]

  const getLabel = (options: Array<{ value: string; label: string }>, value: string | null) => {
    if (!value) return null
    return options.find(o => o.value === value || o.label === value)?.label || value
  }

  const vehicleShort: Record<string, string> = {
    'Model Y': 'MY', 'Model 3': 'M3', 'Model S': 'MS',
    'Model X': 'MX', 'Cybertruck': 'CT', 'Roadster': 'R',
  }

  const renderEntry = (order: typeof ranked[0], globalIndex: number) => (
    <div
      key={order.id}
      className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <span className="w-6 text-center shrink-0 pt-0.5">
        {globalIndex < 3 ? (
          <Medal className={`h-4 w-4 ${medalColors[globalIndex]}`} />
        ) : (
          <span className="text-xs text-muted-foreground font-mono">{globalIndex + 1}</span>
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/track/${encodeURIComponent(order.name)}`}
            className="font-medium text-sm hover:text-primary transition-colors hover:underline underline-offset-2 truncate"
          >
            {order.name}
          </Link>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {vehicleShort[order.vehicleType] || order.vehicleType}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-muted-foreground">
          {order.model && <span>{getLabel(models, order.model)}</span>}
          {order.color && <><span>·</span><span>{getLabel(colors, order.color)}</span></>}
          {order.drive && <><span>·</span><span>{getLabel(drives, order.drive)}</span></>}
          <span>·</span>
          <span>{order.orderDate} &rarr; {order.deliveryDate}</span>
        </div>
      </div>
      <div className="text-right shrink-0 pt-0.5">
        <span className="text-sm font-mono font-semibold tabular-nums">
          {order.waitingDays}
        </span>
        <span className="text-[11px] text-muted-foreground ml-1">
          {tc('days')}
        </span>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {veterans.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-3 mb-1">
            <Medal className="h-3.5 w-3.5 text-yellow-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('veterans')} ({'>'}={VETERAN_THRESHOLD} {tc('days')})
            </span>
          </div>
          {veterans.map((order, i) => renderEntry(order, i))}
        </div>
      )}
      {reservists.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-3 mb-1">
            <Shield className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('reservists')} ({'<'}{VETERAN_THRESHOLD} {tc('days')})
            </span>
          </div>
          {reservists.map((order, i) => renderEntry(order, veterans.length + i))}
        </div>
      )}
    </div>
  )
}
