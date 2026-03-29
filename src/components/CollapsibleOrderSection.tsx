'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Order } from '@/lib/types'
import { OrderGroup, getQuarterStats } from '@/lib/groupOrders'
import { OrderTable, type OrderTableOptions } from './OrderTable'
import { OrderGroupHeader } from './OrderGroupHeader'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface CollapsibleOrderSectionProps {
  groups: OrderGroup[]
  isAdmin: boolean
  onEdit: (order: Order) => void
  onDelete: (orderId: string) => void
  onGenerateResetCode?: (orderId: string, orderName: string) => void
  onEditByCode?: (order: Order) => void
  onEditTostFields?: (order: Order) => void
  expandedQuarters?: string[]
  onExpandedChange?: (vals: string[]) => void
  highlightOrderId?: string | null
  options?: OrderTableOptions
  scrollToOrderId?: string | null
}

export function CollapsibleOrderSection({
  groups,
  isAdmin,
  onEdit,
  onDelete,
  onGenerateResetCode,
  onEditByCode,
  onEditTostFields,
  expandedQuarters,
  onExpandedChange,
  highlightOrderId,
  options,
  scrollToOrderId,
}: CollapsibleOrderSectionProps) {
  const t = useTranslations('home')

  // Default to opening the first group
  const defaultExpanded = groups.length > 0 ? [groups[0].label] : []
  const [internalExpanded, setInternalExpanded] = useState<string[]>(defaultExpanded)

  // Use controlled or uncontrolled mode
  const isControlled = expandedQuarters !== undefined
  const value = isControlled ? expandedQuarters : internalExpanded
  const onValueChange = isControlled
    ? (onExpandedChange ?? (() => {}))
    : setInternalExpanded

  // Memoize stats for all groups — only recalculate when groups data changes
  const groupStats = useMemo(
    () => groups.map(group => ({ group, stats: getQuarterStats(group) })),
    [groups]
  )

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t('noOrders')}
      </div>
    )
  }

  return (
    <Accordion type="multiple" value={value} onValueChange={onValueChange} className="space-y-4">
      {groupStats.map(({ group, stats }) => (
        <AccordionItem
          key={group.label}
          value={group.label}
          className="border rounded-xl bg-card overflow-hidden shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
        >
          <AccordionTrigger className="px-4 py-3.5 hover:bg-muted/30 hover:no-underline transition-colors">
            <OrderGroupHeader
              label={group.label}
              total={stats.total}
              delivered={stats.delivered}
              pending={stats.pending}
            />
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0 overflow-x-auto">
            {value.includes(group.label) && (
              <div className="w-full">
                <OrderTable
                  orders={group.orders}
                  isAdmin={isAdmin}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onGenerateResetCode={onGenerateResetCode}
                  onEditByCode={onEditByCode}
                  onEditTostFields={onEditTostFields}
                  highlightOrderId={highlightOrderId}
                  options={options}
                  scrollToOrderId={scrollToOrderId}
                />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
