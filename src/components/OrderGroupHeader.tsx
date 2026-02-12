'use client'

import { Badge } from '@/components/ui/badge'
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
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold">{label}</span>
        <Badge variant="secondary" className="font-mono">
          {total}
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-green-500">
          <CheckCircle2 className="h-4 w-4" />
          <span>{delivered}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{pending}</span>
        </div>
        {delivered > 0 && (
          <Badge variant={deliveryRate >= 50 ? 'default' : 'outline'} className="ml-2">
            {deliveryRate}%
          </Badge>
        )}
      </div>
    </div>
  )
}
