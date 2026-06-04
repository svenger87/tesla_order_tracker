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
  const th = useTranslations('home')
  const to = useTranslations('options')

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

  const actionButton = isAdmin ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
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
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={() => onEditTostFields(order)}
      title="TOST Felder"
    >
      <FileText className="h-4 w-4" />
    </Button>
  ) : order.source !== 'tost' ? (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={() => onEditByCode?.(order)}
      title={tc('edit')}
    >
      <Pencil className="h-4 w-4" />
    </Button>
  ) : null

  return (
    <Card className={cn(
      "relative overflow-hidden rounded-none border-0 border-b bg-card shadow-none transition-colors hover:bg-muted/20",
      isStale && "opacity-60 hover:opacity-100 transition-opacity",
    )}>
        <CardContent className="grid grid-cols-[30px_minmax(0,1fr)_78px_58px_38px_10px] items-center gap-1.5 px-3 py-1.5">
          <div className="flex items-center gap-1">
            <span className={cn('h-2.5 w-2.5 rounded-full shadow-sm', statusClass)} title={status} />
            {actionButton}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <Link
                href={`/track/${encodeURIComponent(order.name)}`}
                className="truncate text-sm font-semibold leading-tight hover:text-primary"
              >
                {order.vehicleType || order.name}
              </Link>
              {countryOpt?.flag && <TwemojiEmoji emoji={countryOpt.flag} size={13} />}
              {order.source === 'tost' && (
                <Image src="/tost-badge.svg" alt="TOST" width={42} height={21} className="h-5 w-auto shrink-0" />
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {[modelLabel || rangeLabel, driveLabel].filter(Boolean).join(' · ') || order.name}
            </p>
          </div>

          <div className="min-w-0 text-right">
            <p className="text-xs font-medium tabular-nums">{order.orderDate || tc('noDate')}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {waitingDays !== null ? `~ ${waitingDays} Tage` : order.deliveryWindow || 'n/a'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-1">
            {order.vehicleType && VEHICLE_TYPES.some(vt => vt.value === order.vehicleType) ? (
              <button
                type="button"
                className="flex h-9 w-10 shrink-0 items-center justify-center overflow-hidden"
                onClick={() => onImageClick?.(order)}
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
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </CardContent>
      </Card>
  )
}
