'use client'

import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface ChartCardProps {
  title: string
  icon: LucideIcon
  description?: string
  /** Tints the icon tile — for charts about deliveries rather than orders. */
  tone?: 'brand' | 'success'
  children: React.ReactNode
}

/**
 * The frame every chart on the statistics dashboard sits in.
 *
 * Header, icon tile, shadow pair and the screenshot watermark used to be copied
 * out seven times, so changing the card meant changing it seven times — and the
 * copies had already drifted apart in icon colour.
 */
export function ChartCard({ title, icon: Icon, description, tone = 'brand', children }: ChartCardProps) {
  const tile = tone === 'success' ? 'bg-success/10' : 'bg-primary/10'
  const iconColor = tone === 'success' ? 'text-success' : 'text-primary'

  return (
    <Card className="relative shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className={`rounded-lg ${tile} p-1.5`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">{children}</CardContent>
      <span className="absolute bottom-2 right-3 text-[9px] opacity-[0.15] text-foreground select-none pointer-events-none">
        tff-order-stats.de
      </span>
    </Card>
  )
}
