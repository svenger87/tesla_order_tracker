'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CheckCircle2, Clock } from 'lucide-react'

interface OrderGroupHeaderProps {
  label: string
  total: number
  delivered: number
  pending: number
}

export function OrderGroupHeader({ label, total, delivered, pending }: OrderGroupHeaderProps) {
  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0

  return (
    <div className="flex items-center justify-between w-full pr-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-base sm:text-lg font-bold tracking-tight">{label}</span>
        <Badge variant="secondary" className="font-mono tabular-nums text-xs">
          {total}
        </Badge>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
          <span className="font-medium tabular-nums text-green-600 dark:text-green-400">{delivered}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
          <span className="font-medium tabular-nums text-amber-600 dark:text-amber-400">{pending}</span>
        </div>
        {delivered > 0 && (
          <Badge
            variant={deliveryRate >= 50 ? 'default' : 'outline'}
            className={cn(
              "ml-1 tabular-nums font-semibold",
              deliveryRate >= 75 && "animate-pulse-glow",
              deliveryRate >= 50 && deliveryRate < 75 && "ring-1 ring-primary/50"
            )}
          >
            {deliveryRate}%
          </Badge>
        )}
      </div>
    </div>
  )
}
