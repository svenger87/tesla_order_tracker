'use client'

import { useState, useMemo, memo, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Order, COLORS, COUNTRIES, MODEL_Y_TRIMS, MODEL_3_TRIMS } from '@/lib/types'
import { calculateDaysBetween } from '@/lib/date-utils'
import { TwemojiEmoji } from '@/components/TwemojiText'
import { useOptions, type FormOption } from '@/hooks/useOptions'

// Format relative time using translation function
function formatRelativeTime(dateString: string | undefined, t: (key: string, values?: Record<string, unknown>) => string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return t('timeAgo.justNow')
  if (diffMin < 60) return t('timeAgo.minutesAgo', { n: diffMin })
  if (diffHour < 24) return t('timeAgo.hoursAgo', { n: diffHour })
  if (diffDay === 1) return t('timeAgo.yesterday')
  if (diffDay < 7) return t('timeAgo.daysAgo', { n: diffDay })
  if (diffDay < 30) return t('timeAgo.weeksAgo', { n: Math.floor(diffDay / 7) })
  return t('timeAgo.monthsAgo', { n: Math.floor(diffDay / 30) })
}
import { OrderProgressBar } from './OrderProgressBar'
import { OrderCard } from './OrderCard'
import { TeslaCarImage } from './TeslaCarImage'
import { cn } from '@/lib/utils'

// Pre-build color lookup map for O(1) access
const colorMap = new Map<string, typeof COLORS[0]>()
COLORS.forEach(c => {
  colorMap.set(c.label.toLowerCase(), c)
  // Also add internal code format (with underscores)
  colorMap.set(c.label.toLowerCase().replace(/\s+/g, '_'), c)
  // Also add partial matches
  c.label.toLowerCase().split(' ').forEach(word => {
    if (word.length > 3) colorMap.set(word, c)
  })
})

function findColorInfo(colorLabel: string | null) {
  if (!colorLabel) return null
  const key = colorLabel.toLowerCase().trim()
  // Try exact match first
  if (colorMap.has(key)) return colorMap.get(key)
  // Try finding by partial
  for (const [k, v] of colorMap) {
    if (key.includes(k) || k.includes(key)) return v
  }
  return null
}

// Memoized color cell to avoid re-renders
const ColorCell = memo(function ColorCell({ color }: { color: string | null }) {
  if (!color) return <TableCell className="whitespace-nowrap">-</TableCell>

  const colorInfo = findColorInfo(color)
  // Display label if found, otherwise show formatted color value
  const displayLabel = colorInfo?.label || color.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  return (
    <TableCell className="whitespace-nowrap">
      <div className="flex items-center gap-2">
        {colorInfo && (
          <span
            className={cn(
              "w-4 h-4 rounded-full inline-block shrink-0",
              colorInfo.border && "border border-border"
            )}
            style={{ backgroundColor: colorInfo.hex }}
          />
        )}
        <span>{displayLabel}</span>
      </div>
    </TableCell>
  )
})

// Check if string starts with a flag emoji (regional indicator symbols)
function startsWithFlagEmoji(str: string): boolean {
  // Flag emojis are made of regional indicator symbols (U+1F1E6 to U+1F1FF)
  const flagRegex = /^[\u{1F1E6}-\u{1F1FF}]{2}/u
  return flagRegex.test(str)
}

// Extract flag and country name from string like "🇩🇪 Deutschland"
function parseCountryWithFlag(country: string): { flag: string | null; name: string } {
  if (startsWithFlagEmoji(country)) {
    // Extract the flag (first 2 regional indicator chars) and the rest
    const match = country.match(/^([\u{1F1E6}-\u{1F1FF}]{2})\s*(.*)$/u)
    if (match) {
      return { flag: match[1], name: match[2] || country }
    }
  }
  return { flag: null, name: country }
}

// Memoized country cell with flag
const CountryCell = memo(function CountryCell({
  country,
  countries
}: {
  country: string | null
  countries: Array<{ value: string; label: string; flag?: string }>
}) {
  if (!country) return <TableCell className="whitespace-nowrap">-</TableCell>

  // Check if country already has an embedded flag (old format)
  const { flag: embeddedFlag, name: parsedName } = parseCountryWithFlag(country)

  // Try to find country info from options (by value or label)
  const countryLower = country.toLowerCase()
  const countryInfo = countries.find(
    c => c.value.toLowerCase() === countryLower || c.label.toLowerCase() === countryLower
  )

  // Use label from options if found, otherwise use parsed name
  const displayName = countryInfo?.label || parsedName
  // Use flag from options if no embedded flag
  const flag = embeddedFlag || countryInfo?.flag || null

  return (
    <TableCell className="whitespace-nowrap">
      <div className="flex items-center gap-1.5">
        {flag && <TwemojiEmoji emoji={flag} size={16} />}
        <span>{displayName}</span>
      </div>
    </TableCell>
  )
})
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Search, X, KeyRound, Columns3, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

type SortDirection = 'asc' | 'desc'
type SortField = keyof Order | 'vinToProduction' | 'productionToPapers' | null

interface TableLocalFilters {
  nameSearch: string
  hasVin: '' | 'yes' | 'no'
  hasDelivery: '' | 'yes' | 'no'
}

const emptyLocalFilters: TableLocalFilters = {
  nameSearch: '',
  hasVin: '',
  hasDelivery: '',
}

// Parse date string (DD.MM.YYYY format) to Date for sorting
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null
  const parts = dateStr.split('.')
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number)
    return new Date(year, month - 1, day)
  }
  return null
}

// Strip flag emoji from string for proper sorting
function stripFlagEmoji(str: string): string {
  // Remove regional indicator symbols (flag emojis) from start of string
  return str.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '')
}

// Normalize German umlauts for sorting (Ö→O, Ä→A, Ü→U)
function normalizeForSort(str: string): string {
  return str
    .replace(/Ä/g, 'A')
    .replace(/ä/g, 'a')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
}

// Compute segment value for an order (VIN→Production, Production→Papers)
function getSegmentValue(order: Order, field: string): number | null {
  if (field === 'vinToProduction') return calculateDaysBetween(order.vinReceivedDate, order.productionDate)
  if (field === 'productionToPapers') return calculateDaysBetween(order.productionDate, order.papersReceivedDate)
  return null
}

// Compare function for sorting
function compareValues(a: Order, b: Order, field: SortField, direction: SortDirection, countryLabels?: Map<string, string>): number {
  if (!field) return 0

  // Computed segment fields (not stored on Order)
  if (field === 'vinToProduction' || field === 'productionToPapers') {
    const aNum = getSegmentValue(a, field)
    const bNum = getSegmentValue(b, field)
    if (aNum === null && bNum === null) return 0
    if (aNum === null) return direction === 'asc' ? 1 : -1
    if (bNum === null) return direction === 'asc' ? -1 : 1
    return direction === 'asc' ? aNum - bNum : bNum - aNum
  }

  let aVal = a[field as keyof Order]
  let bVal = b[field as keyof Order]

  // Handle country field - look up translated label for proper alphabetical sorting
  if (field === 'country') {
    const aCode = (aVal as string | null) || ''
    const bCode = (bVal as string | null) || ''
    const aLabel = countryLabels?.get(aCode) || aCode
    const bLabel = countryLabels?.get(bCode) || bCode
    const cmp = aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' })
    return direction === 'asc' ? cmp : -cmp
  }

  // Handle date fields
  const dateFields = ['orderDate', 'vinReceivedDate', 'papersReceivedDate', 'productionDate', 'deliveryDate']
  if (dateFields.includes(field)) {
    const aDate = parseDate(aVal as string | null)
    const bDate = parseDate(bVal as string | null)
    if (!aDate && !bDate) return 0
    if (!aDate) return direction === 'asc' ? 1 : -1
    if (!bDate) return direction === 'asc' ? -1 : 1
    return direction === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime()
  }

  // Handle ISO date fields (updatedAt)
  if (field === 'updatedAt') {
    const aDate = aVal ? new Date(aVal as string) : null
    const bDate = bVal ? new Date(bVal as string) : null
    if (!aDate && !bDate) return 0
    if (!aDate) return direction === 'asc' ? 1 : -1
    if (!bDate) return direction === 'asc' ? -1 : 1
    return direction === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime()
  }

  // Handle numeric fields (including computed segment fields)
  const numericFields = ['orderToVin', 'vinToProduction', 'productionToPapers', 'papersToDelivery']
  if (numericFields.includes(field)) {
    const aNum = aVal as number | null
    const bNum = bVal as number | null
    if (aNum === null && bNum === null) return 0
    if (aNum === null) return direction === 'asc' ? 1 : -1
    if (bNum === null) return direction === 'asc' ? -1 : 1
    return direction === 'asc' ? aNum - bNum : bNum - aNum
  }

  // Handle string fields - normalize umlauts for proper alphabetical sorting (Ö = O, Ä = A, Ü = U)
  const aStr = normalizeForSort((aVal as string | null) || '')
  const bStr = normalizeForSort((bVal as string | null) || '')
  return direction === 'asc'
    ? aStr.localeCompare(bStr, 'de')
    : bStr.localeCompare(aStr, 'de')
}

export interface OrderTableOptions {
  countries: FormOption[]
  models: FormOption[]
  ranges: FormOption[]
  drives: FormOption[]
  interiors: FormOption[]
  wheels: FormOption[]
  autopilot: FormOption[]
  towHitch: FormOption[]
  seats: FormOption[]
  deliveryLocations: FormOption[]
}

interface OrderTableProps {
  orders: Order[]
  isAdmin: boolean
  onEdit: (order: Order) => void
  onDelete: (orderId: string) => void
  onGenerateResetCode?: (orderId: string, orderName: string) => void
  onEditByCode?: (order: Order) => void
  onEditTostFields?: (order: Order) => void
  highlightOrderId?: string | null
  options?: OrderTableOptions
  scrollToOrderId?: string | null
}

interface SortableHeaderProps {
  field: SortField
  currentField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
  children: React.ReactNode
  className?: string
}

function SortableHeader({ field, currentField, direction, onSort, children, className }: SortableHeaderProps) {
  const isActive = currentField === field

  return (
    <TableHead
      className={cn("font-bold whitespace-nowrap cursor-pointer select-none hover:bg-muted/80 transition-colors bg-muted dark:bg-muted", className)}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className="ml-1">
          {isActive ? (
            direction === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          )}
        </span>
      </div>
    </TableHead>
  )
}

// Column visibility system
type ColumnGroup = 'essential' | 'configuration' | 'detail'

interface ColumnDef {
  key: string
  label: string
  group: ColumnGroup
}

const COLUMN_DEFS: ColumnDef[] = [
  // Essential (always visible, not toggleable)
  { key: 'status', label: 'status', group: 'essential' },
  { key: 'name', label: 'name', group: 'essential' },
  { key: 'vehicleType', label: 'vehicle', group: 'essential' },
  { key: 'carImage', label: 'image', group: 'configuration' },
  { key: 'orderDate', label: 'orderDate', group: 'essential' },
  // Configuration
  { key: 'country', label: 'country', group: 'configuration' },
  { key: 'model', label: 'model', group: 'configuration' },
  { key: 'range', label: 'range', group: 'configuration' },
  { key: 'drive', label: 'drive', group: 'configuration' },
  { key: 'color', label: 'color', group: 'configuration' },
  { key: 'interior', label: 'interior', group: 'configuration' },
  { key: 'wheels', label: 'wheels', group: 'configuration' },
  { key: 'towHitch', label: 'towHitch', group: 'configuration' },
  { key: 'seats', label: 'seats', group: 'configuration' },
  { key: 'autopilot', label: 'autopilot', group: 'configuration' },
  // Status & Delivery
  { key: 'deliveryWindow', label: 'deliveryWindow', group: 'configuration' },
  { key: 'deliveryLocation', label: 'deliveryLocation', group: 'configuration' },
  { key: 'vin', label: 'vin', group: 'configuration' },
  { key: 'vinReceivedDate', label: 'vinDate', group: 'configuration' },
  { key: 'papersReceivedDate', label: 'papersDate', group: 'configuration' },
  { key: 'productionDate', label: 'production', group: 'configuration' },
  { key: 'typeApproval', label: 'typeApproval', group: 'configuration' },
  { key: 'typeVariant', label: 'typeVariant', group: 'configuration' },
  { key: 'deliveryDate', label: 'deliveryDate', group: 'configuration' },
  // Detail (segment time periods matching timeline & metadata)
  { key: 'orderToVin', label: 'orderToVin', group: 'detail' },
  { key: 'vinToProduction', label: 'vinToProduction', group: 'detail' },
  { key: 'productionToPapers', label: 'productionToPapers', group: 'detail' },
  { key: 'papersToDelivery', label: 'papersToDelivery', group: 'detail' },
  { key: 'updatedAt', label: 'updatedAt', group: 'detail' },
]

// All columns visible by default
const DEFAULT_VISIBLE_COLUMNS = new Set(
  COLUMN_DEFS.map(c => c.key)
)

const COLUMNS_STORAGE_KEY = 'tesla-tracker-table-columns'
const SORT_STORAGE_KEY = 'tesla-tracker-table-sort'

export const OrderTable = memo(function OrderTable({ orders, isAdmin, onEdit, onDelete, onGenerateResetCode, onEditByCode, onEditTostFields, highlightOrderId, options: optionsProp, scrollToOrderId }: OrderTableProps) {
  const isMobile = useIsMobile()
  const t = useTranslations('table')
  const tc = useTranslations('common')
  const th = useTranslations('home')

  // Default sort: orderDate ascending (oldest first, newest at bottom)
  const [sortField, setSortField] = useState<SortField>('orderDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [localFilters, setLocalFilters] = useState<TableLocalFilters>(emptyLocalFilters)
  const [searchInput, setSearchInput] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(DEFAULT_VISIBLE_COLUMNS)
  const [isHydrated, setIsHydrated] = useState(false)

  // Car image modal
  const [imageModalOrder, setImageModalOrder] = useState<Order | null>(null)

  // Get options from prop (hoisted) or fallback to local useOptions hook
  const fallbackOptions = useOptions()
  const resolvedOptions = optionsProp ?? fallbackOptions.options
  const { countries, models, ranges, drives, interiors, wheels, autopilot: autopilotOptions, towHitch: towHitchOptions, seats: seatsOptions } = resolvedOptions

  // Helper to lookup label from value (falls back to hardcoded trims for model)
  const getLabel = (options: Array<{ value: string; label: string }>, value: string | null): string => {
    if (!value) return '-'
    const option = options.find(o => o.value === value || o.label === value)
    if (option) return option.label
    // Fallback: check hardcoded model trims (in case API options don't include the value)
    const trimFallback = [...MODEL_Y_TRIMS, ...MODEL_3_TRIMS].find(t => t.value === value || t.label === value)
    if (trimFallback) return trimFallback.label
    return value
  }

  // Create a lookup map for country labels (for sorting)
  // Use COUNTRIES constant as fallback if API countries not loaded yet
  const countryLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    // First add from hardcoded COUNTRIES (guaranteed to be available)
    COUNTRIES.forEach(c => map.set(c.value, c.label))
    // Then override with API countries (in case labels differ)
    countries.forEach(c => map.set(c.value, c.label))
    return map
  }, [countries])

  // Refs for sticky scrollbar sync
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const scrollbarRef = useRef<HTMLDivElement>(null)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [clientWidth, setClientWidth] = useState(0)
  const isSyncingScroll = useRef(false)

  // Get username from URL for row highlighting
  const searchParams = useSearchParams()
  const highlightUser = searchParams.get('user')?.toLowerCase()

  // Load sorting and column visibility from localStorage on mount
  useEffect(() => {
    // Load sorting
    const savedSort = localStorage.getItem(SORT_STORAGE_KEY)
    if (savedSort) {
      try {
        const parsed = JSON.parse(savedSort)
        if (parsed.field) setSortField(parsed.field)
        if (parsed.direction) setSortDirection(parsed.direction)
      } catch (e) {
        console.error('Failed to parse saved sort:', e)
      }
    }

    // Load column visibility, auto-including any new columns not in saved set
    const savedColumns = localStorage.getItem(COLUMNS_STORAGE_KEY)
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns)
        if (Array.isArray(parsed)) {
          const saved = new Set(parsed)
          // Add any columns that exist in COLUMN_DEFS but weren't in saved prefs (newly added)
          const allKeys = new Set(COLUMN_DEFS.map(c => c.key))
          for (const key of allKeys) {
            if (!saved.has(key)) saved.add(key)
          }
          setVisibleColumns(saved)
        }
      } catch (e) {
        console.error('Failed to parse saved columns:', e)
      }
    }

    setIsHydrated(true)
  }, [])

  // Save sorting to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ field: sortField, direction: sortDirection }))
    }
  }, [sortField, sortDirection, isHydrated])

  // Save column visibility to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify([...visibleColumns]))
    }
  }, [visibleColumns, isHydrated])

  const isColumnVisible = useCallback((key: string) => visibleColumns.has(key), [visibleColumns])

  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  // Measure scroll dimensions for sticky scrollbar
  useEffect(() => {
    const container = tableContainerRef.current
    if (!container) return

    const updateScrollDimensions = () => {
      setScrollWidth(container.scrollWidth)
      setClientWidth(container.clientWidth)
    }
    updateScrollDimensions()

    const resizeObserver = new ResizeObserver(updateScrollDimensions)
    resizeObserver.observe(container)
    window.addEventListener('resize', updateScrollDimensions)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateScrollDimensions)
    }
  }, [])

  // Sync scroll between table and sticky scrollbar
  const handleTableScroll = useCallback(() => {
    if (isSyncingScroll.current) return
    isSyncingScroll.current = true
    if (tableContainerRef.current && scrollbarRef.current) {
      scrollbarRef.current.scrollLeft = tableContainerRef.current.scrollLeft
    }
    requestAnimationFrame(() => { isSyncingScroll.current = false })
  }, [])

  const handleScrollbarScroll = useCallback(() => {
    if (isSyncingScroll.current) return
    isSyncingScroll.current = true
    if (tableContainerRef.current && scrollbarRef.current) {
      tableContainerRef.current.scrollLeft = scrollbarRef.current.scrollLeft
    }
    requestAnimationFrame(() => { isSyncingScroll.current = false })
  }, [])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Apply local filters (nameSearch, hasVin, hasDelivery) then sort
  const filteredAndSortedOrders = useMemo(() => {
    let result = orders

    // Apply name search filter
    if (localFilters.nameSearch) {
      const searchLower = localFilters.nameSearch.toLowerCase()
      result = result.filter(o => o.name.toLowerCase().includes(searchLower))
    }

    // Apply hasVin filter
    if (localFilters.hasVin === 'yes') {
      result = result.filter(o => !!o.vin)
    } else if (localFilters.hasVin === 'no') {
      result = result.filter(o => !o.vin)
    }

    // Apply hasDelivery filter
    if (localFilters.hasDelivery === 'yes') {
      result = result.filter(o => !!o.deliveryDate)
    } else if (localFilters.hasDelivery === 'no') {
      result = result.filter(o => !o.deliveryDate)
    }

    // Apply sort
    if (sortField) {
      result = [...result].sort((a, b) => compareValues(a, b, sortField, sortDirection, countryLabelMap))
    }

    return result
  }, [orders, localFilters, sortField, sortDirection, countryLabelMap])

  // Update scroll dimensions when data or visible columns change
  useEffect(() => {
    requestAnimationFrame(() => {
      const container = tableContainerRef.current
      if (container) {
        setScrollWidth(container.scrollWidth)
        setClientWidth(container.clientWidth)
      }
    })
  }, [filteredAndSortedOrders.length, visibleColumns])

  // Virtualizer for desktop table rows
  const ROW_HEIGHT = 41
  const tableVirtualizer = useVirtualizer({
    count: filteredAndSortedOrders.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  })

  // Virtualizer for mobile cards
  const mobileContainerRef = useRef<HTMLDivElement>(null)
  const CARD_HEIGHT = 180
  const mobileVirtualizer = useVirtualizer({
    count: filteredAndSortedOrders.length,
    getScrollElement: () => mobileContainerRef.current,
    estimateSize: () => CARD_HEIGHT,
    overscan: 5,
  })

  // Scroll virtualizer to a specific order when requested (e.g. from global search)
  useEffect(() => {
    if (!scrollToOrderId) return
    const index = filteredAndSortedOrders.findIndex(o => o.id === scrollToOrderId)
    if (index === -1) return

    const virtualizer = isMobile ? mobileVirtualizer : tableVirtualizer
    virtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' })
  }, [scrollToOrderId, filteredAndSortedOrders, isMobile, tableVirtualizer, mobileVirtualizer])

  return (
    <div className="space-y-2">
      {/* Toolbar: Search, VIN/Delivery toggles, Columns */}
      <div className="flex flex-wrap items-center gap-2 px-2">
        {/* Name Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={tc('searchName')}
            value={searchInput}
            onChange={(e) => {
              const val = e.target.value
              setSearchInput(val)
              if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
              searchDebounceRef.current = setTimeout(() => {
                setLocalFilters(f => ({ ...f, nameSearch: val }))
              }, 250)
            }}
            className="h-8 w-[140px] sm:w-[180px] pl-8 pr-7 text-sm"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('')
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
                setLocalFilters(f => ({ ...f, nameSearch: '' }))
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {/* VIN pill toggle */}
        <Button
          variant={localFilters.hasVin === 'yes' ? 'default' : localFilters.hasVin === 'no' ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setLocalFilters(f => ({
            ...f,
            hasVin: f.hasVin === '' ? 'yes' : f.hasVin === 'yes' ? 'no' : ''
          }))}
        >
          VIN {localFilters.hasVin === 'yes' ? '\u2713' : localFilters.hasVin === 'no' ? '\u2717' : ''}
        </Button>
        {/* Delivery pill toggle */}
        <Button
          variant={localFilters.hasDelivery === 'yes' ? 'default' : localFilters.hasDelivery === 'no' ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setLocalFilters(f => ({
            ...f,
            hasDelivery: f.hasDelivery === '' ? 'yes' : f.hasDelivery === 'yes' ? 'no' : ''
          }))}
        >
          {t('deliveredFilter')} {localFilters.hasDelivery === 'yes' ? '\u2713' : localFilters.hasDelivery === 'no' ? '\u2717' : ''}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Columns3 className="h-4 w-4" />
              {tc('columns')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-3" align="start">
            <div className="space-y-3">
              <p className="text-sm font-medium">{tc('visibleColumns')}</p>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{tc('configuration')}</p>
                {COLUMN_DEFS.filter(c => c.group === 'configuration').map(col => (
                  <div key={col.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${col.key}`}
                      checked={isColumnVisible(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    <Label htmlFor={`col-${col.key}`} className="text-sm cursor-pointer">{t(col.label)}</Label>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{tc('detail')}</p>
                {COLUMN_DEFS.filter(c => c.group === 'detail').map(col => (
                  <div key={col.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${col.key}`}
                      checked={isColumnVisible(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    <Label htmlFor={`col-${col.key}`} className="text-sm cursor-pointer">{t(col.label)}</Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <span className="text-xs sm:text-sm text-muted-foreground ml-auto">
          {filteredAndSortedOrders.length} / {orders.length}
        </span>
      </div>

      {/* Mobile Card View - only rendered on small screens */}
      {isMobile ? (
        filteredAndSortedOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {orders.length === 0 ? th('noOrders') : th('noFilterResults')}
          </div>
        ) : (
          <div
            ref={mobileContainerRef}
            className="px-1 overflow-auto"
            style={{ maxHeight: '70vh' }}
          >
            <div
              style={{
                height: mobileVirtualizer.getTotalSize(),
                width: '100%',
                position: 'relative',
              }}
            >
              {mobileVirtualizer.getVirtualItems().map((virtualItem) => {
                const order = filteredAndSortedOrders[virtualItem.index]
                return (
                  <div
                    key={order.id}
                    data-order-id={order.id}
                    ref={mobileVirtualizer.measureElement}
                    data-index={virtualItem.index}
                    className={cn(
                      "rounded-lg transition-colors duration-500 pb-3",
                      highlightOrderId === order.id && "ring-2 ring-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/20 animate-pulse"
                    )}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <OrderCard
                      order={order}
                      isAdmin={isAdmin}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onGenerateResetCode={onGenerateResetCode}
                      onEditByCode={onEditByCode}
                      onEditTostFields={onEditTostFields}
                      onImageClick={setImageModalOrder}
                      options={{ models, ranges, drives, interiors, countries }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      ) : null}

      {/* Desktop Table View - only rendered on medium+ screens */}
      {!isMobile ? (<><div
        ref={tableContainerRef}
        onScroll={handleTableScroll}
        className="rounded-md border bg-card dark:bg-card w-full max-h-[70vh] overflow-auto scrollbar-hide-horizontal"
      >
        <table className="w-full min-w-max caption-bottom text-xs">
        <TableHeader className="sticky top-0 z-20 bg-background">
          <TableRow className="bg-muted dark:bg-muted hover:bg-muted dark:hover:bg-muted">
            {isColumnVisible('status') && <TableHead className="font-bold whitespace-nowrap bg-muted dark:bg-muted">{t('status')}</TableHead>}
            {isColumnVisible('name') && <SortableHeader field="name" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('name')}</SortableHeader>}
            {isColumnVisible('vehicleType') && <SortableHeader field="vehicleType" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('vehicle')}</SortableHeader>}
            {isColumnVisible('carImage') && <TableHead className="font-bold whitespace-nowrap bg-muted dark:bg-muted">{t('image')}</TableHead>}
            {isColumnVisible('orderDate') && <SortableHeader field="orderDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('orderDate')}</SortableHeader>}
            {isColumnVisible('country') && <SortableHeader field="country" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('country')}</SortableHeader>}
            {isColumnVisible('model') && <SortableHeader field="model" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('model')}</SortableHeader>}
            {isColumnVisible('range') && <SortableHeader field="range" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('range')}</SortableHeader>}
            {isColumnVisible('drive') && <SortableHeader field="drive" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('drive')}</SortableHeader>}
            {isColumnVisible('color') && <SortableHeader field="color" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('color')}</SortableHeader>}
            {isColumnVisible('interior') && <SortableHeader field="interior" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('interior')}</SortableHeader>}
            {isColumnVisible('wheels') && <SortableHeader field="wheels" currentField={sortField} direction={sortDirection} onSort={handleSort} className="min-w-[56px]">{t('wheels')}</SortableHeader>}
            {isColumnVisible('towHitch') && <SortableHeader field="towHitch" currentField={sortField} direction={sortDirection} onSort={handleSort} className="min-w-[48px]">{t('towHitch')}</SortableHeader>}
            {isColumnVisible('seats') && <SortableHeader field="seats" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('seats')}</SortableHeader>}
            {isColumnVisible('autopilot') && <SortableHeader field="autopilot" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('autopilot')}</SortableHeader>}
            {isColumnVisible('deliveryWindow') && <SortableHeader field="deliveryWindow" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('deliveryWindow')}</SortableHeader>}
            {isColumnVisible('deliveryLocation') && <SortableHeader field="deliveryLocation" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('deliveryLocation')}</SortableHeader>}
            {isColumnVisible('vin') && <SortableHeader field="vin" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('vin')}</SortableHeader>}
            {isColumnVisible('vinReceivedDate') && <SortableHeader field="vinReceivedDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('vinDate')}</SortableHeader>}
            {isColumnVisible('papersReceivedDate') && <SortableHeader field="papersReceivedDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('papersDate')}</SortableHeader>}
            {isColumnVisible('productionDate') && <SortableHeader field="productionDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('production')}</SortableHeader>}
            {isColumnVisible('typeApproval') && <SortableHeader field="typeApproval" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('typeApproval')}</SortableHeader>}
            {isColumnVisible('typeVariant') && <SortableHeader field="typeVariant" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('typeVariant')}</SortableHeader>}
            {isColumnVisible('deliveryDate') && <SortableHeader field="deliveryDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('deliveryDate')}</SortableHeader>}
            {isColumnVisible('orderToVin') && <SortableHeader field="orderToVin" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('orderToVin')}</SortableHeader>}
            {isColumnVisible('vinToProduction') && <SortableHeader field="vinToProduction" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('vinToProduction')}</SortableHeader>}
            {isColumnVisible('productionToPapers') && <SortableHeader field="productionToPapers" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('productionToPapers')}</SortableHeader>}
            {isColumnVisible('papersToDelivery') && <SortableHeader field="papersToDelivery" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('papersToDelivery')}</SortableHeader>}
            {isColumnVisible('updatedAt') && <SortableHeader field="updatedAt" currentField={sortField} direction={sortDirection} onSort={handleSort}>{t('updatedAt')}</SortableHeader>}
            <TableHead className="font-bold whitespace-nowrap sticky right-0 bg-muted dark:bg-muted shadow-[-2px_0_4px_rgba(0,0,0,0.15)] dark:shadow-[-2px_0_4px_rgba(0,0,0,0.4)] z-30">
              {tc('actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSortedOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.size + 1} className="text-center py-8 text-muted-foreground">
                {orders.length === 0 ? th('noOrders') : th('noFilterResults')}
              </TableCell>
            </TableRow>
          ) : (<>
            {tableVirtualizer.getVirtualItems()[0]?.start > 0 && (
              <tr><td colSpan={visibleColumns.size + 1} style={{ height: tableVirtualizer.getVirtualItems()[0].start, padding: 0, border: 'none' }} /></tr>
            )}
            {tableVirtualizer.getVirtualItems().map((virtualRow) => {
              const order = filteredAndSortedOrders[virtualRow.index]
              const isHighlighted = highlightUser && order.name.toLowerCase() === highlightUser
              const isSearchHighlighted = highlightOrderId === order.id
              return (
              <TableRow
                key={order.id}
                data-order-id={order.id}
                data-index={virtualRow.index}
                ref={tableVirtualizer.measureElement}
                className={cn(
                  "border-b hover:bg-muted/50 border-l-2 border-l-transparent",
                  order.deliveryDate
                    ? "hover:border-l-green-500"
                    : "hover:border-l-amber-500",
                  isHighlighted && "bg-primary/10 hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25",
                  isSearchHighlighted && "bg-yellow-100/80 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/40 animate-pulse"
                )}
              >
                {isColumnVisible('status') && (
                  <TableCell className="whitespace-nowrap">
                    <OrderProgressBar order={order} compact />
                  </TableCell>
                )}
                {isColumnVisible('name') && (
                  <TableCell className="font-medium whitespace-nowrap">
                    <Link
                      href={`/track/${encodeURIComponent(order.name)}`}
                      className="hover:text-primary transition-colors hover:underline underline-offset-2"
                    >
                      {order.name}
                    </Link>
                    {order.source === 'tost' && (
                      <a href="https://www.tesla-order-status-tracker.de/" target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-block align-middle hover:opacity-70 transition-opacity">
                        <img src="/tost-badge.svg" alt="TOST" className="h-8 w-auto" />
                      </a>
                    )}
                  </TableCell>
                )}
                {isColumnVisible('vehicleType') && (
                  <TableCell className="whitespace-nowrap">
                    {order.vehicleType ? (
                      <Badge variant="outline" className="text-xs">
                        {order.vehicleType === 'Model Y' ? 'MY' : order.vehicleType === 'Model 3' ? 'M3' : order.vehicleType}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                )}
                {isColumnVisible('carImage') && (
                  <TableCell className="p-1">
                    {order.vehicleType && (order.vehicleType === 'Model Y' || order.vehicleType === 'Model 3') ? (
                      <button
                        type="button"
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setImageModalOrder(order)}
                      >
                        <TeslaCarImage
                          vehicleType={order.vehicleType as 'Model Y' | 'Model 3'}
                          color={order.color}
                          wheels={order.wheels}
                          model={order.model}
                          drive={order.drive}
                          interior={order.interior}
                          size={80}
                          fetchSize={400}
                        />
                      </button>
                    ) : '-'}
                  </TableCell>
                )}
                {isColumnVisible('orderDate') && (
                  <TableCell className="whitespace-nowrap">{order.orderDate || '-'}</TableCell>
                )}
                {isColumnVisible('country') && (
                  <CountryCell country={order.country} countries={countries} />
                )}
                {isColumnVisible('model') && (
                  <TableCell className="whitespace-nowrap">
                    {order.model ? (
                      <Badge
                        variant={order.model.toLowerCase().includes('performance') ? 'destructive' : 'secondary'}
                        className="font-medium"
                      >
                        {getLabel(models, order.model)}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                )}
                {isColumnVisible('range') && (
                  <TableCell className="whitespace-nowrap">
                    {order.range ? (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                        {getLabel(ranges, order.range) === 'Maximale Reichweite' ? 'Max. RW' : getLabel(ranges, order.range)}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                )}
                {isColumnVisible('drive') && (
                  <TableCell className="whitespace-nowrap">
                    {order.drive ? (
                      <Badge variant="outline" className={cn(
                        "font-mono",
                        getLabel(drives, order.drive).includes('AWD') || getLabel(drives, order.drive).includes('Dual')
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
                          : ""
                      )}>
                        {getLabel(drives, order.drive)}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                )}
                {isColumnVisible('color') && <ColorCell color={order.color} />}
                {isColumnVisible('interior') && (
                  <TableCell className="whitespace-nowrap">{getLabel(interiors, order.interior)}</TableCell>
                )}
                {isColumnVisible('wheels') && (
                  <TableCell className="whitespace-nowrap">{getLabel(wheels, order.wheels)}</TableCell>
                )}
                {isColumnVisible('towHitch') && (
                  <TableCell className="whitespace-nowrap">
                    {order.towHitch ? (
                      <Badge variant={order.towHitch.toLowerCase() === 'ja' ? 'default' : 'outline'}>
                        {getLabel(towHitchOptions, order.towHitch)}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                )}
                {isColumnVisible('seats') && (
                  <TableCell className="whitespace-nowrap">
                    {order.seats ? getLabel(seatsOptions, order.seats) : '5-Sitzer'}
                  </TableCell>
                )}
                {isColumnVisible('autopilot') && (
                  <TableCell className="whitespace-nowrap">
                    {order.autopilot ? (
                      <Badge variant="secondary">{getLabel(autopilotOptions, order.autopilot)}</Badge>
                    ) : '-'}
                  </TableCell>
                )}
                {isColumnVisible('deliveryWindow') && (
                  <TableCell className="whitespace-nowrap">{order.deliveryWindow || '-'}</TableCell>
                )}
                {isColumnVisible('deliveryLocation') && (
                  <TableCell className="whitespace-nowrap">{order.deliveryLocation || '-'}</TableCell>
                )}
                {isColumnVisible('vin') && (
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {order.vin ? order.vin.substring(0, 17) : '-'}
                  </TableCell>
                )}
                {isColumnVisible('vinReceivedDate') && (
                  <TableCell className="whitespace-nowrap">{order.vinReceivedDate || '-'}</TableCell>
                )}
                {isColumnVisible('papersReceivedDate') && (
                  <TableCell className="whitespace-nowrap">{order.papersReceivedDate || '-'}</TableCell>
                )}
                {isColumnVisible('productionDate') && (
                  <TableCell className="whitespace-nowrap">{order.productionDate || '-'}</TableCell>
                )}
                {isColumnVisible('typeApproval') && (
                  <TableCell className="whitespace-nowrap">{order.typeApproval || '-'}</TableCell>
                )}
                {isColumnVisible('typeVariant') && (
                  <TableCell className="whitespace-nowrap">{order.typeVariant || '-'}</TableCell>
                )}
                {isColumnVisible('deliveryDate') && (
                  <TableCell className="whitespace-nowrap">
                    {order.deliveryDate ? (() => {
                      const deliveryParsed = parseDate(order.deliveryDate)
                      const isDelivered = deliveryParsed && deliveryParsed <= new Date()
                      return (
                        <Badge
                          variant={isDelivered ? "default" : "outline"}
                          className={isDelivered
                            ? "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white"
                            : "text-muted-foreground"
                          }
                        >
                          {order.deliveryDate}
                        </Badge>
                      )
                    })() : '-'}
                  </TableCell>
                )}
                {isColumnVisible('orderToVin') && (
                  <TableCell className="whitespace-nowrap text-center font-mono">
                    {order.orderToVin !== null ? order.orderToVin : '-'}
                  </TableCell>
                )}
                {isColumnVisible('vinToProduction') && (
                  <TableCell className="whitespace-nowrap text-center font-mono">
                    {(() => { const v = calculateDaysBetween(order.vinReceivedDate, order.productionDate); return v !== null ? v : '-' })()}
                  </TableCell>
                )}
                {isColumnVisible('productionToPapers') && (
                  <TableCell className="whitespace-nowrap text-center font-mono">
                    {(() => { const v = calculateDaysBetween(order.productionDate, order.papersReceivedDate); return v !== null ? v : '-' })()}
                  </TableCell>
                )}
                {isColumnVisible('papersToDelivery') && (
                  <TableCell className="whitespace-nowrap text-center font-mono">
                    {order.papersToDelivery !== null ? order.papersToDelivery : '-'}
                  </TableCell>
                )}
                {isColumnVisible('updatedAt') && (
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatRelativeTime(order.updatedAt, t as any)}
                  </TableCell>
                )}
                <TableCell className="sticky right-0 bg-card dark:bg-card shadow-[-2px_0_4px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_4px_rgba(0,0,0,0.4)] z-10">
                  {isAdmin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
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
                            {t('editTostFields')}
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
                      className="h-8 w-8"
                      onClick={() => onEditTostFields(order)}
                      title={t('editTostFields')}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  ) : order.source !== 'tost' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEditByCode?.(order)}
                      title={tc('edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            )})}
            {(() => {
              const items = tableVirtualizer.getVirtualItems()
              const lastItem = items[items.length - 1]
              const bottomPad = lastItem ? tableVirtualizer.getTotalSize() - lastItem.end : 0
              return bottomPad > 0 ? <tr><td colSpan={visibleColumns.size + 1} style={{ height: bottomPad, padding: 0, border: 'none' }} /></tr> : null
            })()}
          </>)}
        </TableBody>
      </table>
      </div>

      {/* Sticky horizontal scrollbar - only show when table overflows */}
      {scrollWidth > clientWidth && (
        <div
          ref={scrollbarRef}
          onScroll={handleScrollbarScroll}
          className="sticky bottom-0 z-30 overflow-x-auto overflow-y-hidden bg-background/80 backdrop-blur-sm border-t"
          style={{ height: '16px' }}
        >
          <div style={{ width: scrollWidth, height: '1px' }} />
        </div>
      )}
      </>) : null}

      {/* Car image modal */}
      <Dialog open={!!imageModalOrder} onOpenChange={(open) => { if (!open) setImageModalOrder(null) }}>
        <DialogContent className="max-w-md p-4" aria-describedby={undefined}>
          <VisuallyHidden>
            <DialogTitle>{th('vehicleImage')}</DialogTitle>
          </VisuallyHidden>
          {imageModalOrder && imageModalOrder.vehicleType && (imageModalOrder.vehicleType === 'Model Y' || imageModalOrder.vehicleType === 'Model 3') && (
            <div className="space-y-3">
              <div className="flex justify-center">
                <TeslaCarImage
                  vehicleType={imageModalOrder.vehicleType as 'Model Y' | 'Model 3'}
                  color={imageModalOrder.color}
                  wheels={imageModalOrder.wheels}
                  model={imageModalOrder.model}
                  drive={imageModalOrder.drive}
                  interior={imageModalOrder.interior}
                  size={400}
                  fetchSize={800}
                />
              </div>
              <div className="text-center text-sm text-muted-foreground">
                <span className="font-medium">{imageModalOrder.name}</span>
                {' — '}
                {imageModalOrder.vehicleType}
                {imageModalOrder.model ? ` ${getLabel(models, imageModalOrder.model)}` : ''}
                {imageModalOrder.color ? ` · ${getLabel(COLORS.map(c => ({ value: c.value, label: c.label })), imageModalOrder.color)}` : ''}
                {imageModalOrder.wheels ? ` · ${imageModalOrder.wheels}"` : ''}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
})
