'use client'

import { useState, useMemo, memo, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Order, COLORS, COUNTRIES } from '@/lib/types'
import { TwemojiEmoji } from '@/components/TwemojiText'
import { useOptions } from '@/hooks/useOptions'

// Format relative time (e.g., "vor 5 Minuten", "vor 3 Tagen")
function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'gerade eben'
  if (diffMin < 60) return `vor ${diffMin} Min.`
  if (diffHour < 24) return `vor ${diffHour} Std.`
  if (diffDay === 1) return 'gestern'
  if (diffDay < 7) return `vor ${diffDay} Tagen`
  if (diffDay < 30) return `vor ${Math.floor(diffDay / 7)} Wo.`
  return `vor ${Math.floor(diffDay / 30)} Mon.`
}
import { OrderProgressBar } from './OrderProgressBar'
import { OrderCard } from './OrderCard'
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
import { MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Filter, X, Search, KeyRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SortDirection = 'asc' | 'desc'
type SortField = keyof Order | null

interface Filters {
  vehicleType: string
  model: string
  range: string
  drive: string
  color: string
  country: string
  deliveryLocation: string
  wheels: string
  interior: string
  towHitch: string
  autopilot: string
  hasVin: string
  hasDelivery: string
  nameSearch: string
}

const emptyFilters: Filters = {
  vehicleType: '',
  model: '',
  range: '',
  drive: '',
  color: '',
  country: '',
  deliveryLocation: '',
  wheels: '',
  interior: '',
  towHitch: '',
  autopilot: '',
  hasVin: '',
  hasDelivery: '',
  nameSearch: '',
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

// Compare function for sorting
function compareValues(a: Order, b: Order, field: SortField, direction: SortDirection): number {
  if (!field) return 0

  let aVal = a[field]
  let bVal = b[field]

  // Handle country field - strip flag emojis and normalize umlauts for proper alphabetical sorting
  if (field === 'country') {
    const aCountry = normalizeForSort(stripFlagEmoji((aVal as string | null) || ''))
    const bCountry = normalizeForSort(stripFlagEmoji((bVal as string | null) || ''))
    return direction === 'asc'
      ? aCountry.localeCompare(bCountry)
      : bCountry.localeCompare(aCountry)
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

  // Handle numeric fields
  const numericFields = ['orderToProduction', 'orderToVin', 'orderToDelivery', 'orderToPapers', 'papersToDelivery']
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

interface OrderTableProps {
  orders: Order[]
  isAdmin: boolean
  onEdit: (order: Order) => void
  onDelete: (orderId: string) => void
  onGenerateResetCode?: (orderId: string, orderName: string) => void
}

interface SortableHeaderProps {
  field: SortField
  currentField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
  children: React.ReactNode
}

function SortableHeader({ field, currentField, direction, onSort, children }: SortableHeaderProps) {
  const isActive = currentField === field

  return (
    <TableHead
      className="font-bold whitespace-nowrap cursor-pointer select-none hover:bg-muted/80 transition-colors bg-muted dark:bg-muted"
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

const FILTERS_STORAGE_KEY = 'tesla-tracker-table-filters'
const SORT_STORAGE_KEY = 'tesla-tracker-table-sort'

export function OrderTable({ orders, isAdmin, onEdit, onDelete, onGenerateResetCode }: OrderTableProps) {
  // Default sort: orderDate ascending (oldest first, newest at bottom)
  const [sortField, setSortField] = useState<SortField>('orderDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Get options from useOptions hook (includes labels for values)
  const { countries, models, ranges, drives, interiors, wheels, autopilot: autopilotOptions, towHitch: towHitchOptions } = useOptions()

  // Helper to lookup label from value
  const getLabel = (options: Array<{ value: string; label: string }>, value: string | null): string => {
    if (!value) return '-'
    const option = options.find(o => o.value === value || o.label === value)
    return option?.label || value
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

  // Sort country codes by their labels with umlaut normalization
  const sortCountryCodes = useCallback((codes: string[]) => {
    return [...codes].sort((a, b) => {
      const labelA = countryLabelMap.get(a) || a
      const labelB = countryLabelMap.get(b) || b
      const normA = normalizeForSort(labelA)
      const normB = normalizeForSort(labelB)
      if (normA < normB) return -1
      if (normA > normB) return 1
      return 0
    })
  }, [countryLabelMap])

  // Refs for sticky scrollbar sync
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const scrollbarRef = useRef<HTMLDivElement>(null)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [clientWidth, setClientWidth] = useState(0)
  const isSyncingScroll = useRef(false)

  // Get username from URL for row highlighting
  const searchParams = useSearchParams()
  const highlightUser = searchParams.get('user')?.toLowerCase()

  // Load filters and sorting from localStorage on mount
  useEffect(() => {
    // Load filters
    const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY)
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters)
        setFilters({ ...emptyFilters, ...parsed })
        if (Object.values(parsed).some(Boolean)) {
          setShowFilters(true)
        }
      } catch (e) {
        console.error('Failed to parse saved filters:', e)
      }
    }

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

    setIsHydrated(true)
  }, [])

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
    }
  }, [filters, isHydrated])

  // Save sorting to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ field: sortField, direction: sortDirection }))
    }
  }, [sortField, sortDirection, isHydrated])

  // Measure scroll dimensions for sticky scrollbar
  useEffect(() => {
    const container = tableContainerRef.current
    if (!container) return

    const updateScrollDimensions = () => {
      setScrollWidth(container.scrollWidth)
      setClientWidth(container.clientWidth)
    }
    updateScrollDimensions()

    // Use MutationObserver to detect content changes (like filtered data)
    const mutationObserver = new MutationObserver(updateScrollDimensions)
    mutationObserver.observe(container, { childList: true, subtree: true })

    const resizeObserver = new ResizeObserver(updateScrollDimensions)
    resizeObserver.observe(container)
    window.addEventListener('resize', updateScrollDimensions)

    return () => {
      mutationObserver.disconnect()
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

  // Extract unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    return {
      vehicleType: [...new Set(orders.map(o => o.vehicleType).filter(Boolean))].sort() as string[],
      model: [...new Set(orders.map(o => o.model).filter(Boolean))].sort() as string[],
      range: [...new Set(orders.map(o => o.range).filter(Boolean))].sort() as string[],
      drive: [...new Set(orders.map(o => o.drive).filter(Boolean))].sort() as string[],
      color: [...new Set(orders.map(o => o.color).filter(Boolean))].sort() as string[],
      // Don't sort here - sortCountryCodes handles it at render time with proper fallback
      country: [...new Set(orders.map(o => o.country).filter(Boolean))] as string[],
      deliveryLocation: ([...new Set(orders.map(o => o.deliveryLocation).filter(Boolean))] as string[]).sort((a, b) =>
        normalizeForSort(a).localeCompare(normalizeForSort(b))
      ),
      wheels: [...new Set(orders.map(o => o.wheels).filter(Boolean))].sort() as string[],
      interior: [...new Set(orders.map(o => o.interior).filter(Boolean))].sort() as string[],
      towHitch: [...new Set(orders.map(o => o.towHitch).filter(Boolean))].sort() as string[],
      autopilot: [...new Set(orders.map(o => o.autopilot).filter(Boolean))].sort() as string[],
    }
  }, [orders])

  const activeFilterCount = Object.values(filters).filter(Boolean).length

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

  const clearFilters = () => setFilters(emptyFilters)

  // Apply filters then sort
  const filteredAndSortedOrders = useMemo(() => {
    let result = orders

    // Apply name search filter
    if (filters.nameSearch) {
      const searchLower = filters.nameSearch.toLowerCase()
      result = result.filter(o => o.name.toLowerCase().includes(searchLower))
    }

    // Apply vehicle type filter
    if (filters.vehicleType) {
      result = result.filter(o => o.vehicleType === filters.vehicleType)
    }

    // Apply filters
    if (filters.model) {
      result = result.filter(o => o.model === filters.model)
    }
    if (filters.range) {
      result = result.filter(o => o.range === filters.range)
    }
    if (filters.drive) {
      result = result.filter(o => o.drive === filters.drive)
    }
    if (filters.color) {
      result = result.filter(o => o.color === filters.color)
    }
    if (filters.country) {
      result = result.filter(o => o.country === filters.country)
    }
    if (filters.deliveryLocation) {
      result = result.filter(o => o.deliveryLocation === filters.deliveryLocation)
    }
    if (filters.wheels) {
      result = result.filter(o => o.wheels === filters.wheels)
    }
    if (filters.interior) {
      result = result.filter(o => o.interior === filters.interior)
    }
    if (filters.towHitch) {
      result = result.filter(o => o.towHitch === filters.towHitch)
    }
    if (filters.autopilot) {
      result = result.filter(o => o.autopilot === filters.autopilot)
    }
    if (filters.hasVin === 'yes') {
      result = result.filter(o => !!o.vin)
    } else if (filters.hasVin === 'no') {
      result = result.filter(o => !o.vin)
    }
    if (filters.hasDelivery === 'yes') {
      result = result.filter(o => !!o.deliveryDate)
    } else if (filters.hasDelivery === 'no') {
      result = result.filter(o => !o.deliveryDate)
    }

    // Apply sort
    if (sortField) {
      result = [...result].sort((a, b) => compareValues(a, b, sortField, sortDirection))
    }

    return result
  }, [orders, filters, sortField, sortDirection])

  return (
    <div className="space-y-2">
      {/* Filter Toggle and Bar */}
      <div className="flex flex-wrap items-center gap-2 px-2">
        {/* Name Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Name suchen..."
            value={filters.nameSearch}
            onChange={(e) => setFilters(f => ({ ...f, nameSearch: e.target.value }))}
            className="h-8 w-[140px] sm:w-[180px] pl-8 text-sm"
          />
        </div>
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden xs:inline">Filter</span>
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3 w-3" />
            <span className="hidden sm:inline">Filter zurücksetzen</span>
          </Button>
        )}
        <span className="text-xs sm:text-sm text-muted-foreground ml-auto">
          {filteredAndSortedOrders.length} / {orders.length}
        </span>
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-md">
          <Select value={filters.vehicleType} onValueChange={(v) => setFilters(f => ({ ...f, vehicleType: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Fahrzeug" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Fahrzeuge</SelectItem>
              {filterOptions.vehicleType.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.model} onValueChange={(v) => setFilters(f => ({ ...f, model: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Models</SelectItem>
              {filterOptions.model.map(v => <SelectItem key={v} value={v}>{getLabel(models, v)}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.range} onValueChange={(v) => setFilters(f => ({ ...f, range: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Reichweite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Reichweiten</SelectItem>
              {filterOptions.range.map(v => <SelectItem key={v} value={v}>{getLabel(ranges, v) === 'Maximale Reichweite' ? 'Max. RW' : getLabel(ranges, v)}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.drive} onValueChange={(v) => setFilters(f => ({ ...f, drive: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue placeholder="Antrieb" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              {filterOptions.drive.map(v => <SelectItem key={v} value={v}>{getLabel(drives, v)}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.color} onValueChange={(v) => setFilters(f => ({ ...f, color: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Farbe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Farben</SelectItem>
              {filterOptions.color.map(v => {
                const colorInfo = findColorInfo(v)
                return (
                  <SelectItem key={v} value={v}>
                    <span className="flex items-center gap-2">
                      {colorInfo?.hex && (
                        <span
                          className={cn("w-3 h-3 rounded-full inline-block", colorInfo.border && "border border-border")}
                          style={{ backgroundColor: colorInfo.hex }}
                        />
                      )}
                      {colorInfo?.label || v}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Select value={filters.country} onValueChange={(v) => setFilters(f => ({ ...f, country: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="Land" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Länder</SelectItem>
              {sortCountryCodes(filterOptions.country).map(v => {
                const countryInfo = countries.find(c => c.value === v)
                return (
                  <SelectItem key={v} value={v}>
                    <span className="flex items-center gap-2">
                      {countryInfo?.flag && <TwemojiEmoji emoji={countryInfo.flag} size={16} />}
                      {countryInfo?.label || v}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Select value={filters.deliveryLocation} onValueChange={(v) => setFilters(f => ({ ...f, deliveryLocation: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue placeholder="Ort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Orte</SelectItem>
              {filterOptions.deliveryLocation.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.wheels} onValueChange={(v) => setFilters(f => ({ ...f, wheels: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue placeholder="Felgen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Felgen</SelectItem>
              {filterOptions.wheels.map(v => <SelectItem key={v} value={v}>{getLabel(wheels, v)}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.interior} onValueChange={(v) => setFilters(f => ({ ...f, interior: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Innenraum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              {filterOptions.interior.map(v => <SelectItem key={v} value={v}>{getLabel(interiors, v)}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.towHitch} onValueChange={(v) => setFilters(f => ({ ...f, towHitch: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[90px] h-8">
              <SelectValue placeholder="AHK" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              {filterOptions.towHitch.map(v => <SelectItem key={v} value={v}>{getLabel(towHitchOptions, v)}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.autopilot} onValueChange={(v) => setFilters(f => ({ ...f, autopilot: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue placeholder="Autopilot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              {filterOptions.autopilot.map(v => <SelectItem key={v} value={v}>{getLabel(autopilotOptions, v)}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.hasVin} onValueChange={(v) => setFilters(f => ({ ...f, hasVin: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue placeholder="VIN" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="yes">Mit VIN</SelectItem>
              <SelectItem value="no">Ohne VIN</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.hasDelivery} onValueChange={(v) => setFilters(f => ({ ...f, hasDelivery: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue placeholder="Geliefert" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="yes">Geliefert</SelectItem>
              <SelectItem value="no">Ausstehend</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Mobile Card View - visible on small screens */}
      <div className="md:hidden space-y-3 px-1">
        {filteredAndSortedOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {orders.length === 0 ? 'Keine Bestellungen vorhanden' : 'Keine Einträge mit diesen Filtern'}
          </div>
        ) : (
          filteredAndSortedOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
              onGenerateResetCode={onGenerateResetCode}
            />
          ))
        )}
      </div>

      {/* Desktop Table View - hidden on small screens */}
      <div
        ref={tableContainerRef}
        onScroll={handleTableScroll}
        className="hidden md:block rounded-md border bg-card dark:bg-card w-full max-h-[70vh] overflow-auto scrollbar-hide-horizontal"
      >
        <table className="w-full min-w-max caption-bottom text-sm">
        <TableHeader className="sticky top-0 z-20">
          <TableRow className="bg-muted dark:bg-muted hover:bg-muted dark:hover:bg-muted">
            <TableHead className="font-bold whitespace-nowrap bg-muted dark:bg-muted">Status</TableHead>
            <SortableHeader field="name" currentField={sortField} direction={sortDirection} onSort={handleSort}>Name</SortableHeader>
            <SortableHeader field="vehicleType" currentField={sortField} direction={sortDirection} onSort={handleSort}>Fahrzeug</SortableHeader>
            <SortableHeader field="orderDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>Bestelldatum</SortableHeader>
            <SortableHeader field="country" currentField={sortField} direction={sortDirection} onSort={handleSort}>Land</SortableHeader>
            <SortableHeader field="model" currentField={sortField} direction={sortDirection} onSort={handleSort}>Model</SortableHeader>
            <SortableHeader field="range" currentField={sortField} direction={sortDirection} onSort={handleSort}>Reichweite</SortableHeader>
            <SortableHeader field="drive" currentField={sortField} direction={sortDirection} onSort={handleSort}>Antrieb</SortableHeader>
            <SortableHeader field="color" currentField={sortField} direction={sortDirection} onSort={handleSort}>Farbe</SortableHeader>
            <SortableHeader field="interior" currentField={sortField} direction={sortDirection} onSort={handleSort}>Innen</SortableHeader>
            <SortableHeader field="wheels" currentField={sortField} direction={sortDirection} onSort={handleSort}>Felgen</SortableHeader>
            <SortableHeader field="towHitch" currentField={sortField} direction={sortDirection} onSort={handleSort}>AHK</SortableHeader>
            <SortableHeader field="autopilot" currentField={sortField} direction={sortDirection} onSort={handleSort}>Autopilot</SortableHeader>
            <SortableHeader field="deliveryWindow" currentField={sortField} direction={sortDirection} onSort={handleSort}>Lieferfenster</SortableHeader>
            <SortableHeader field="deliveryLocation" currentField={sortField} direction={sortDirection} onSort={handleSort}>Ort</SortableHeader>
            <SortableHeader field="vin" currentField={sortField} direction={sortDirection} onSort={handleSort}>VIN</SortableHeader>
            <SortableHeader field="vinReceivedDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>VIN am</SortableHeader>
            <SortableHeader field="papersReceivedDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>Papiere am</SortableHeader>
            <SortableHeader field="productionDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>Produktion</SortableHeader>
            <SortableHeader field="typeApproval" currentField={sortField} direction={sortDirection} onSort={handleSort}>Typgen.</SortableHeader>
            <SortableHeader field="typeVariant" currentField={sortField} direction={sortDirection} onSort={handleSort}>Typ-Var.</SortableHeader>
            <SortableHeader field="deliveryDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>Lieferdatum</SortableHeader>
            <SortableHeader field="orderToProduction" currentField={sortField} direction={sortDirection} onSort={handleSort}>B→P</SortableHeader>
            <SortableHeader field="orderToVin" currentField={sortField} direction={sortDirection} onSort={handleSort}>B→VIN</SortableHeader>
            <SortableHeader field="orderToDelivery" currentField={sortField} direction={sortDirection} onSort={handleSort}>B→L</SortableHeader>
            <SortableHeader field="orderToPapers" currentField={sortField} direction={sortDirection} onSort={handleSort}>B→Pap</SortableHeader>
            <SortableHeader field="papersToDelivery" currentField={sortField} direction={sortDirection} onSort={handleSort}>Pap→L</SortableHeader>
            <SortableHeader field="updatedAt" currentField={sortField} direction={sortDirection} onSort={handleSort}>Änderung</SortableHeader>
            {isAdmin && (
              <TableHead className="font-bold whitespace-nowrap sticky right-0 bg-muted dark:bg-muted shadow-[-2px_0_4px_rgba(0,0,0,0.15)] dark:shadow-[-2px_0_4px_rgba(0,0,0,0.4)] z-30">
                Aktionen
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSortedOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin ? 29 : 28} className="text-center py-8 text-muted-foreground">
                {orders.length === 0 ? 'Keine Bestellungen vorhanden' : 'Keine Einträge mit diesen Filtern'}
              </TableCell>
            </TableRow>
          ) : (
            filteredAndSortedOrders.map((order) => {
              const isHighlighted = highlightUser && order.name.toLowerCase() === highlightUser
              return (
              <TableRow
                key={order.id}
                className={cn(
                  "border-b hover:bg-muted/50",
                  isHighlighted && "bg-primary/10 hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25"
                )}
              >
                <TableCell className="whitespace-nowrap">
                  <OrderProgressBar order={order} compact />
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">{order.name}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {order.vehicleType ? (
                    <Badge variant="outline" className="text-xs">
                      {order.vehicleType === 'Model Y' ? 'MY' : order.vehicleType === 'Model 3' ? 'M3' : order.vehicleType}
                    </Badge>
                  ) : '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap">{order.orderDate || '-'}</TableCell>
                <CountryCell country={order.country} countries={countries} />
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
                <TableCell className="whitespace-nowrap">
                  {order.range ? (
                    <Badge variant="outline" className="text-xs">
                      {getLabel(ranges, order.range) === 'Maximale Reichweite' ? 'Max. RW' : getLabel(ranges, order.range)}
                    </Badge>
                  ) : '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {order.drive ? (
                    <Badge variant="outline" className="font-mono">
                      {getLabel(drives, order.drive)}
                    </Badge>
                  ) : '-'}
                </TableCell>
                <ColorCell color={order.color} />
                <TableCell className="whitespace-nowrap">{getLabel(interiors, order.interior)}</TableCell>
                <TableCell className="whitespace-nowrap">{getLabel(wheels, order.wheels)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {order.towHitch ? (
                    <Badge variant={order.towHitch.toLowerCase() === 'ja' ? 'default' : 'outline'}>
                      {getLabel(towHitchOptions, order.towHitch)}
                    </Badge>
                  ) : '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {order.autopilot ? (
                    <Badge variant="secondary">{getLabel(autopilotOptions, order.autopilot)}</Badge>
                  ) : '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap">{order.deliveryWindow || '-'}</TableCell>
                <TableCell className="whitespace-nowrap">{order.deliveryLocation || '-'}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs">
                  {order.vin ? order.vin.substring(0, 17) : '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap">{order.vinReceivedDate || '-'}</TableCell>
                <TableCell className="whitespace-nowrap">{order.papersReceivedDate || '-'}</TableCell>
                <TableCell className="whitespace-nowrap">{order.productionDate || '-'}</TableCell>
                <TableCell className="whitespace-nowrap">{order.typeApproval || '-'}</TableCell>
                <TableCell className="whitespace-nowrap">{order.typeVariant || '-'}</TableCell>
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
                <TableCell className="whitespace-nowrap text-center font-mono">
                  {order.orderToProduction !== null ? order.orderToProduction : '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-center font-mono">
                  {order.orderToVin !== null ? order.orderToVin : '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-center font-mono">
                  {order.orderToDelivery !== null ? order.orderToDelivery : '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-center font-mono">
                  {order.orderToPapers !== null ? order.orderToPapers : '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-center font-mono">
                  {order.papersToDelivery !== null ? order.papersToDelivery : '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatRelativeTime(order.updatedAt)}
                </TableCell>
                {isAdmin && (
                  <TableCell className="sticky right-0 bg-card dark:bg-card shadow-[-2px_0_4px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_4px_rgba(0,0,0,0.4)] z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(order)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Bearbeiten
                        </DropdownMenuItem>
                        {onGenerateResetCode && (
                          <DropdownMenuItem onClick={() => onGenerateResetCode(order.id, order.name)}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Einmalcode generieren
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onDelete(order.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            )})
          )}
        </TableBody>
      </table>
      </div>

      {/* Sticky horizontal scrollbar - only show when table overflows */}
      {scrollWidth > clientWidth && (
        <div
          ref={scrollbarRef}
          onScroll={handleScrollbarScroll}
          className="hidden md:block sticky bottom-0 z-30 overflow-x-auto overflow-y-hidden bg-background/80 backdrop-blur-sm border-t"
          style={{ height: '16px' }}
        >
          <div style={{ width: scrollWidth, height: '1px' }} />
        </div>
      )}
    </div>
  )
}
