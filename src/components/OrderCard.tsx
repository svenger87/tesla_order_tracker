'use client'

import { Order, COLORS, VehicleType } from '@/lib/types'
import { OrderProgressBar } from './OrderProgressBar'
import { TeslaCarThumbnail } from './TeslaCarImage'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Pencil, Trash2, MapPin, Calendar, Car, Hash } from 'lucide-react'

// Helper to find color info by label
function findColorInfo(colorLabel: string | null) {
  if (!colorLabel) return null
  const normalizedLabel = colorLabel.toLowerCase().trim()
  return COLORS.find(c =>
    normalizedLabel.includes(c.label.toLowerCase()) ||
    c.label.toLowerCase().includes(normalizedLabel)
  )
}

interface OrderCardProps {
  order: Order
  isAdmin: boolean
  onEdit: (order: Order) => void
  onDelete: (orderId: string) => void
}

export function OrderCard({ order, isAdmin, onEdit, onDelete }: OrderCardProps) {
  const colorInfo = findColorInfo(order.color)

  return (
    <Card className="relative overflow-hidden">
        {/* Status bar at top */}
        <div className="h-1.5">
          <OrderProgressBar order={order} compact barOnly />
        </div>

        {/* Car image */}
        {order.vehicleType && (order.vehicleType === 'Model Y' || order.vehicleType === 'Model 3') && (
          <div className="flex justify-center py-2 bg-gradient-to-b from-muted/30 to-transparent">
            <TeslaCarThumbnail
              vehicleType={order.vehicleType as VehicleType}
              color={order.color}
              wheels={order.wheels}
            />
          </div>
        )}

        <CardContent className="p-4">
          {/* Header row: Name + Admin menu */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{order.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                <Calendar className="h-3 w-3" />
                <span>{order.orderDate || 'Kein Datum'}</span>
                {order.country && <span>{order.country}</span>}
              </div>
            </div>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(order)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(order.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Car config badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {order.vehicleType && (
              <Badge variant="outline" className="text-xs font-semibold">
                {order.vehicleType === 'Model Y' ? 'MY' : order.vehicleType === 'Model 3' ? 'M3' : order.vehicleType}
              </Badge>
            )}
            {order.model && (
              <Badge
                variant={order.model.toLowerCase().includes('performance') ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {order.model}
              </Badge>
            )}
            {order.range && (
              <Badge variant="outline" className="text-xs">
                {order.range === 'Maximale Reichweite' ? 'Max. RW' : order.range}
              </Badge>
            )}
            {order.drive && (
              <Badge variant="outline" className="text-xs font-mono">
                {order.drive}
              </Badge>
            )}
            {colorInfo && (
              <Badge variant="outline" className="text-xs gap-1">
                <span
                  className={cn(
                    "w-2.5 h-2.5 rounded-full inline-block",
                    colorInfo.border && "border border-border"
                  )}
                  style={{ backgroundColor: colorInfo.hex }}
                />
                {order.color}
              </Badge>
            )}
            {order.interior && (
              <Badge variant="outline" className="text-xs">
                {order.interior}
              </Badge>
            )}
          </div>

          {/* Key details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {order.vin && (
              <div className="col-span-2 flex items-center gap-2">
                <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs truncate">{order.vin}</span>
              </div>
            )}
            {order.deliveryLocation && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{order.deliveryLocation}</span>
              </div>
            )}
            {order.deliveryWindow && (
              <div className="flex items-center gap-2">
                <Car className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate text-xs">{order.deliveryWindow}</span>
              </div>
            )}
          </div>

          {/* Delivery status */}
          {order.deliveryDate && (
            <div className="mt-3 pt-3 border-t">
              <Badge variant="default" className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white">
                Geliefert: {order.deliveryDate}
              </Badge>
            </div>
          )}

          {/* Duration stats - compact row */}
          {(order.orderToVin || order.orderToDelivery) && (
            <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground">
              {order.orderToVin && (
                <span>B→VIN: <span className="font-mono">{order.orderToVin}d</span></span>
              )}
              {order.orderToDelivery && (
                <span>B→L: <span className="font-mono">{order.orderToDelivery}d</span></span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
  )
}
