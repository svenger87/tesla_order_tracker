'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Order, VEHICLE_TYPES, VehicleType } from '@/lib/types'
import type { FormOption } from '@/hooks/useOptions'
import { TeslaCarThumbnail } from './TeslaCarImage'
import { cn } from '@/lib/utils'
import { calculateDaysBetween, getOrderStatus, isStaleOrder, parseGermanDate } from '@/lib/statistics'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronRight, FileText, KeyRound, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { TwemojiEmoji } from '@/components/TwemojiText'
import { Link } from '@/i18n/navigation'

export interface OrderCardOptions {
  models: FormOption[]
  ranges: FormOption[]
  drives: FormOption[]
  interiors: FormOption[]
  countries: FormOption[]
}

interface OrderCardProps {
  order: Order
  isAdmin: boolean
  onEdit: (order: Order) => void
  onDelete: (orderId: string) => void
  onGenerateResetCode?: (orderId: string, orderName: string) => void
  onEditByCode?: (order: Order) => void
  onEditTostFields?: (order: Order) => void
  onImageClick?: (order: Order) => void
  options: OrderCardOptions
}

export function OrderCard({ order, isAdmin, onEdit, onDelete, onGenerateResetCode, onEditByCode, onEditTostFields, onImageClick, options }: OrderCardProps) {
  const [nowMs] = useState(() => Date.now())
  const tc = useTranslations('common')
  const tt = useTranslations('table')
  const th = useTranslations('home')
  const to = useTranslations('options')
  const tp = useTranslations('progress')

  const { models, ranges, drives, countries } = options

  // Helper to lookup label from value
  const getLabel = (options: Array<{ value: string; label: string }>, value: string | null): string => {
    if (!value) return ''
    const option = options.find(o => o.value === value || o.label === value)
    return option?.label || value
  }

  const isStale = isStaleOrder(order)
  const status = getOrderStatus(order)
  const orderDate = parseGermanDate(order.orderDate)
  const currentWaitingDays = orderDate
    ? Math.max(0, Math.floor((nowMs - orderDate.getTime()) / 86_400_000))
    : null
  const waitingDays = order.orderToDelivery ?? calculateDaysBetween(order.orderDate, order.deliveryDate) ?? currentWaitingDays
  const modelLabel = getLabel(models, order.model)
  const rangeLabel = order.range === 'maximale_reichweite'
    ? to('range.maxRangeShort')
    : getLabel(ranges, order.range)
  const driveLabel = getLabel(drives, order.drive)
  const countryOpt = countries.find(c => c.value === order.country)

  const statusClass = {
    ordered: 'bg-neutral-400',
    vin_received: 'bg-blue-500',
    production: 'bg-amber-500',
    papers_received: 'bg-cyan-500',
    delivery_scheduled: 'bg-amber-500',
    delivered: 'bg-green-500',
  }[status]

  // The dot used to expose the raw enum key ("papers_received") as its tooltip.
  const statusLabel = tp({
    ordered: 'ordered',
    vin_received: 'vinReceived',
    production: 'production',
    papers_received: 'papers',
    delivery_scheduled: 'deliveryScheduled',
    delivered: 'delivered',
  }[status])

  const actionButton = isAdmin ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">{tc('actions')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {order.source !== 'tost' && (
          <DropdownMenuItem onClick={() => onEdit(order)}>
            <Pencil className="mr-2 h-4 w-4" />
            {tc('edit')}
          </DropdownMenuItem>
        )}
        {order.source === 'tost' && onEditTostFields && (
          <DropdownMenuItem onClick={() => onEditTostFields(order)}>
            <FileText className="mr-2 h-4 w-4" />
            TOST Felder
          </DropdownMenuItem>
        )}
        {onGenerateResetCode && order.source !== 'tost' && (
          <DropdownMenuItem onClick={() => onGenerateResetCode(order.id, order.name)}>
            <KeyRound className="mr-2 h-4 w-4" />
            {th('generateResetCode')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => onDelete(order.id)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {tc('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : order.source === 'tost' && onEditTostFields ? (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={() => onEditTostFields(order)}
      // Was a hardcoded German string in an app that ships 23 languages, and
      // the same action in the table already had a name — use that one.
      title={tt('editTostFields')}
      aria-label={tt('editTostFields')}
    >
      <FileText className="h-4 w-4" />
    </Button>
  ) : order.source !== 'tost' ? (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={() => onEditByCode?.(order)}
      title={tc('edit')}
      aria-label={tc('edit')}
    >
      <Pencil className="h-4 w-4" />
    </Button>
  ) : null

  return (
    <Card className={cn(
      // Card's base style carries gap-6/py-6; unset it here, or every row in
      // the virtualised mobile list pays 48px of dead padding — 105px rows
      // around 56px of content, and the 58px estimate is never close.
      "relative gap-0 overflow-hidden rounded-none border-0 border-b bg-card py-0 shadow-none transition-colors hover:bg-muted/20",
      (isStale || order.cancelled) && "opacity-60 hover:opacity-100 transition-opacity",
    )}>
        {/* The row itself is the link, so the whole card is one tap target
            rather than just the name text. Interactive children sit above it
            and re-enable pointer events for themselves. */}
        <Link
          href={`/track/${encodeURIComponent(order.name)}`}
          className="absolute inset-0 z-0"
          aria-label={`${order.name} — ${[order.vehicleType, modelLabel].filter(Boolean).join(' ')}`}
        />
        {/* Track widths mirror the mobile header row in OrderTable. */}
        <CardContent className="pointer-events-none relative z-10 grid grid-cols-[14px_minmax(0,1fr)_76px_52px_36px] items-center gap-1.5 px-3 py-2">
          <span
            className={cn('h-2.5 w-2.5 rounded-full shadow-sm', statusClass)}
            title={statusLabel}
            aria-label={statusLabel}
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="truncate text-sm font-semibold leading-tight">{order.name}</span>
              {order.cancelled && (
                <span
                  className="shrink-0 rounded-sm border border-destructive/40 bg-destructive/10 px-1 py-px text-[9px] font-medium text-destructive"
                  title={th('cancelledHint')}
                >
                  {th('cancelledBadge')}
                </span>
              )}
              {countryOpt?.flag && <TwemojiEmoji emoji={countryOpt.flag} size={13} />}
              {order.source === 'tost' && (
                <Image src="/tost-badge.svg" alt="TOST" width={42} height={21} className="h-4 w-auto shrink-0" />
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {[order.vehicleType, modelLabel || rangeLabel, driveLabel].filter(Boolean).join(' · ')}
            </p>
          </div>

          <div className="min-w-0 text-right">
            <p className="text-xs font-medium tabular-nums">{order.orderDate || tc('noDate')}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {waitingDays !== null ? `~ ${waitingDays} ${tc('days')}` : order.deliveryWindow || '–'}
            </p>
          </div>

          <div className="pointer-events-auto flex items-center justify-end">
            {order.vehicleType && VEHICLE_TYPES.some(vt => vt.value === order.vehicleType) ? (
              <button
                type="button"
                className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden"
                onClick={() => onImageClick?.(order)}
                aria-label={th('vehicleImage')}
              >
                <TeslaCarThumbnail
                  vehicleType={order.vehicleType as VehicleType}
                  color={order.color}
                  wheels={order.wheels}
                  model={order.model}
                  drive={order.drive}
                  interior={order.interior}
                />
              </button>
            ) : null}
          </div>

          <div className="pointer-events-auto flex items-center justify-end">
            {actionButton ?? <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
          </div>
        </CardContent>
      </Card>
  )
}
