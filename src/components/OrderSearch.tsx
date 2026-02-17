'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Order } from '@/lib/types'
import { OrderGroup } from '@/lib/groupOrders'
import { Badge } from '@/components/ui/badge'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'

interface OrderSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: Order[]
  orderGroups: OrderGroup[]
  onSelectOrder: (orderId: string, quarterLabel: string) => void
}

export function OrderSearch({
  open,
  onOpenChange,
  orders,
  orderGroups,
  onSelectOrder,
}: OrderSearchProps) {
  const t = useTranslations('search')

  // Register Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  // Build a map from order ID to quarter label for quick lookup
  const orderQuarterMap = new Map<string, string>()
  for (const group of orderGroups) {
    for (const order of group.orders) {
      orderQuarterMap.set(order.id, group.label)
    }
  }

  const handleSelect = (orderId: string) => {
    const quarterLabel = orderQuarterMap.get(orderId)
    if (quarterLabel) {
      onSelectOrder(orderId, quarterLabel)
    }
    onOpenChange(false)
  }

  // Custom filter: search across name, VIN, country, delivery location, vehicle type
  const filterOrder = (value: string, search: string) => {
    const searchLower = search.toLowerCase()
    // value is the CommandItem's value (order id), but we stored searchable text as keywords
    // cmdk uses value for filtering, so we encode searchable data in the value
    return value.toLowerCase().includes(searchLower) ? 1 : 0
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('description')}
      showCloseButton={false}
    >
      <CommandInput placeholder={t('placeholder')} />
      <CommandList>
        <CommandEmpty>{t('noResults')}</CommandEmpty>
        {orderGroups.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.orders.map((order) => {
              // Build a searchable value string containing all fields
              const vinSuffix = order.vin ? order.vin.slice(-6) : ''
              const searchValue = [
                order.id,
                order.name,
                order.vin || '',
                vinSuffix,
                order.country || '',
                order.deliveryLocation || '',
                order.vehicleType || '',
              ].join(' ')

              return (
                <CommandItem
                  key={order.id}
                  value={searchValue}
                  onSelect={() => handleSelect(order.id)}
                  className="flex items-center gap-2"
                >
                  <span className="font-medium truncate">{order.name}</span>
                  {order.vehicleType && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                      {order.vehicleType === 'Model Y' ? 'MY' : order.vehicleType === 'Model 3' ? 'M3' : order.vehicleType}
                    </Badge>
                  )}
                  {order.country && (
                    <span className="text-xs text-muted-foreground truncate">{order.country}</span>
                  )}
                  {order.vin && (
                    <span className="text-xs text-muted-foreground font-mono ml-auto shrink-0">
                      ...{order.vin.slice(-6)}
                    </span>
                  )}
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
