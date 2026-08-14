'use client'

import { useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { OrderGroup } from '@/lib/groupOrders'
import { Order } from '@/lib/types'
import { findColorInfo } from '@/lib/color-lookup'
import { getOrderStatus } from '@/lib/statistics'
import { TwemojiEmoji } from '@/components/TwemojiText'
import type { OrderTableOptions } from '@/components/OrderTable'
import { cn } from '@/lib/utils'
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
  orderGroups: OrderGroup[]
  onSelectOrder: (orderId: string, quarterLabel: string) => void
  options?: OrderTableOptions
}

/**
 * Which delivery stage an order has reached, and how that should read.
 *
 * Semantic tokens, not a fresh set of colours: delivered is the same green as
 * everywhere else in the app, waiting the same amber.
 */
const STATUS_STYLE: Record<string, string> = {
  delivered: 'bg-success/10 text-success border-success/25',
  delivery_scheduled: 'bg-success/10 text-success border-success/25',
  papers_received: 'bg-data/10 text-data border-data/25',
  production: 'bg-data/10 text-data border-data/25',
  vin_received: 'bg-data/10 text-data border-data/25',
  ordered: 'bg-pending/10 text-pending border-pending/25',
}

const STATUS_LABEL: Record<string, string> = {
  delivered: 'delivered',
  delivery_scheduled: 'deliveryScheduled',
  papers_received: 'papers',
  production: 'production',
  vin_received: 'vinReceived',
  ordered: 'ordered',
}

export function OrderSearch({
  open,
  onOpenChange,
  orderGroups,
  onSelectOrder,
  options,
}: OrderSearchProps) {
  const t = useTranslations('search')
  const tp = useTranslations('progress')

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

  const orderQuarterMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const group of orderGroups) {
      for (const order of group.orders) map.set(order.id, group.label)
    }
    return map
  }, [orderGroups])

  const totalOrders = useMemo(
    () => orderGroups.reduce((sum, g) => sum + g.orders.length, 0),
    [orderGroups],
  )

  const countryByValue = useMemo(() => {
    const map = new Map<string, { label: string; flag?: string }>()
    for (const c of options?.countries ?? []) {
      map.set(c.value.toLowerCase(), { label: c.label, flag: c.flag })
    }
    return map
  }, [options?.countries])

  const handleSelect = (orderId: string) => {
    const quarterLabel = orderQuarterMap.get(orderId)
    if (quarterLabel) onSelectOrder(orderId, quarterLabel)
    onOpenChange(false)
  }

  /**
   * Every word typed has to appear somewhere in the row (AND), but a word that
   * starts a token ranks above one found mid-word.
   *
   * Plain substring matching alone made short queries useless: "de" hit every
   * row, because it sits inside Amsterdam, Netherlands and Model. Ranking
   * rather than excluding keeps the mid-word hits reachable — someone typing
   * "7687" for "sven.7687" still finds it — while the rows that actually begin
   * with what you typed come first.
   */
  const filterOrder = (value: string, search: string) => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return 1

    const valueLower = value.toLowerCase()
    const tokens = valueLower.split(/[\s.·_/-]+/).filter(Boolean)

    let score = 0
    for (const word of words) {
      if (tokens.some(token => token.startsWith(word))) score += 1
      else if (valueLower.includes(word)) score += 0.25
      else return 0
    }
    return score / words.length
  }

  /**
   * Everything cmdk matches against. It used to hold the internal country code
   * only, so typing "Deutschland" — the word actually on screen — found
   * nothing, while "de" matched half the list as a substring.
   */
  const haystack = (order: Order) => {
    const country = countryByValue.get((order.country ?? '').toLowerCase())
    return [
      order.name,
      order.vin ?? '',
      order.vin ? order.vin.slice(-6) : '',
      country?.label ?? order.country ?? '',
      order.country ?? '',
      order.deliveryLocation ?? '',
      order.vehicleType ?? '',
      order.orderDate ?? '',
      findColorInfo(order.color)?.label ?? '',
    ].join(' ')
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('description')}
      filter={filterOrder}
      className="sm:max-w-2xl"
    >
      <CommandInput placeholder={t('placeholder')} />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>
          <div className="py-6 text-center">
            <p className="text-sm font-medium">{t('noResults')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('noResultsHint')}</p>
          </div>
        </CommandEmpty>

        {orderGroups.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.orders.map((order) => {
              const color = findColorInfo(order.color)
              const country = countryByValue.get((order.country ?? '').toLowerCase())
              const status = getOrderStatus(order)
              const meta = [country?.label ?? order.country, order.deliveryLocation]
                .filter(Boolean)
                .join(' · ')

              return (
                <CommandItem
                  key={order.id}
                  value={haystack(order)}
                  onSelect={() => handleSelect(order.id)}
                  className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 py-2.5"
                >
                  {/* The paint colour anchors the row — people recognise their
                      own car before they finish reading their own name. */}
                  <span
                    aria-hidden
                    className={cn(
                      'row-span-2 h-3.5 w-3.5 rounded-full',
                      color?.border && 'border border-border',
                      !color && 'bg-muted',
                    )}
                    style={color ? { backgroundColor: color.hex } : undefined}
                  />

                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{order.name}</span>
                    {order.vehicleType && (
                      <span className="shrink-0 rounded border px-1 text-[10px] leading-4 text-muted-foreground">
                        {order.vehicleType === 'Model Y' ? 'MY' : order.vehicleType === 'Model 3' ? 'M3' : order.vehicleType}
                      </span>
                    )}
                  </span>

                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                      STATUS_STYLE[status],
                    )}
                  >
                    {tp(STATUS_LABEL[status])}
                  </span>

                  <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    {country?.flag && <TwemojiEmoji emoji={country.flag} size={12} className="shrink-0" />}
                    <span className="truncate">{meta}</span>
                  </span>

                  <span className="shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                    {order.orderDate ?? ''}
                    {order.vin && (
                      <span className="ml-2 font-mono">…{order.vin.slice(-6)}</span>
                    )}
                  </span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
      </CommandList>

      <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
        <span>{t('hint')}</span>
        <span className="tabular-nums">{t('results', { count: totalOrders })}</span>
      </div>
    </CommandDialog>
  )
}
