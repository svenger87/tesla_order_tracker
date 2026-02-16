'use client'

import { useState, useMemo, memo, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Order, COLORS, COUNTRIES, MODEL_Y_TRIMS, MODEL_3_TRIMS } from '@/lib/types'
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
import { MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Filter, X, Search, KeyRound, Columns3 } from 'lucide-react'
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

  // Handle country field - look up label from code and normalize umlauts for proper alphabetical sorting
  if (field === 'country') {
    const aCode = (aVal as string | null) || ''
    const bCode = (bVal as string | null) || ''
    // Look up country labels from COUNTRIES constant
    const aLabel = COUNTRIES.find(c => c.value === aCode)?.label || aCode
    const bLabel = COUNTRIES.find(c => c.value === bCode)?.label || bCode
    const aCountry = normalizeForSort(aLabel)
    const bCountry = normalizeForSort(bLabel)
    if (aCountry < bCountry) return direction === 'asc' ? -1 : 1
    if (aCountry > bCountry) return direction === 'asc' ? 1 : -1
    return 0
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

// Column visibility system
type ColumnGroup = 'essential' | 'configuration' | 'detail'

interface ColumnDef {
  key: string
  label: string
  group: ColumnGroup
}

const COLUMN_DEFS: ColumnDef[] = [
  // Essential (always visible, not toggleable)
  { key: 'status', label: 'Status', group: 'essential' },
  { key: 'name', label: 'Name', group: 'essential' },
  { key: 'vehicleType', label: 'Fahrzeug', group: 'essential' },
  { key: 'carImage', label: 'Bild', group: 'configuration' },
  { key: 'orderDate', label: 'Bestelldatum', group: 'essential' },
  // Configuration
  { key: 'country', label: 'Land', group: 'configuration' },
  { key: 'model', label: 'Model', group: 'configuration' },
  { key: 'range', label: 'Reichweite', group: 'configuration' },
  { key: 'drive', label: 'Antrieb', group: 'configuration' },
  { key: 'color', label: 'Farbe', group: 'configuration' },
  { key: 'interior', label: 'Innen', group: 'configuration' },
  { key: 'wheels', label: 'Felgen', group: 'configuration' },
  { key: 'towHitch', label: 'AHK', group: 'configuration' },
  { key: 'autopilot', label: 'Autopilot', group: 'configuration' },
  // Status & Delivery
  { key: 'deliveryWindow', label: 'Lieferfenster', group: 'configuration' },
  { key: 'deliveryLocation', label: 'Ort', group: 'configuration' },
  { key: 'vin', label: 'VIN', group: 'configuration' },
  { key: 'vinReceivedDate', label: 'VIN am', group: 'configuration' },
  { key: 'papersReceivedDate', label: 'Papiere am', group: 'configuration' },
  { key: 'productionDate', label: 'Produktion', group: 'configuration' },
  { key: 'typeApproval', label: 'Typgen.', group: 'configuration' },
  { key: 'typeVariant', label: 'Typ-Var.', group: 'configuration' },
  { key: 'deliveryDate', label: 'Lieferdatum', group: 'configuration' },
  // Detail (time periods & metadata)
  { key: 'orderToProduction', label: 'B→P', group: 'detail' },
  { key: 'orderToVin', label: 'B→VIN', group: 'detail' },
  { key: 'orderToDelivery', label: 'B→L', group: 'detail' },
  { key: 'orderToPapers', label: 'B→Pap', group: 'detail' },
  { key: 'papersToDelivery', label: 'Pap→L', group: 'detail' },
  { key: 'updatedAt', label: 'Änderung', group: 'detail' },
]

// All columns visible by default
const DEFAULT_VISIBLE_COLUMNS = new Set(
  COLUMN_DEFS.map(c => c.key)
)

const COLUMNS_STORAGE_KEY = 'tesla-tracker-table-columns'
const FILTERS_STORAGE_KEY = 'tesla-tracker-table-filters'
const SORT_STORAGE_KEY = 'tesla-tracker-table-sort'

export function OrderTable({ orders, isAdmin, onEdit, onDelete, onGenerateResetCode }: OrderTableProps) {
  // Default sort: orderDate ascending (oldest first, newest at bottom)
  const [sortField, setSortField] = useState<SortField>('orderDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(DEFAULT_VISIBLE_COLUMNS)
  const [isHydrated, setIsHydrated] = useState(false)

  // Car image modal
  const [imageModalOrder, setImageModalOrder] = useState<Order | null>(null)

  // Get options from useOptions hook (includes labels for values)
  const { countries, models, ranges, drives, interiors, wheels, autopilot: autopilotOptions, towHitch: towHitchOptions } = useOptions()

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

  // Load filters, sorting, and column visibility from localStorage on mount
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
          Filter
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Columns3 className="h-4 w-4" />
              Spalten
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-3" align="start">
            <div className="space-y-3">
              <p className="text-sm font-medium">Sichtbare Spalten</p>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Konfiguration</p>
                {COLUMN_DEFS.filter(c => c.group === 'configuration').map(col => (
                  <div key={col.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${col.key}`}
                      checked={isColumnVisible(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    <Label htmlFor={`col-${col.key}`} className="text-sm cursor-pointer">{col.label}</Label>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Detail</p>
                {COLUMN_DEFS.filter(c => c.group === 'detail').map(col => (
                  <div key={col.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${col.key}`}
                      checked={isColumnVisible(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    <Label htmlFor={`col-${col.key}`} className="text-sm cursor-pointer">{col.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
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
        <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-md overflow-x-auto">
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
              onImageClick={setImageModalOrder}
              options={{ models, ranges, drives, interiors }}
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
        <table className="w-full min-w-max caption-bottom text-xs">
        <TableHeader className="sticky top-0 z-20">
          <TableRow className="bg-muted dark:bg-muted hover:bg-muted dark:hover:bg-muted">
            {isColumnVisible('status') && <TableHead className="font-bold whitespace-nowrap bg-muted dark:bg-muted">Status</TableHead>}
            {isColumnVisible('name') && <SortableHeader field="name" currentField={sortField} direction={sortDirection} onSort={handleSort}>Name</SortableHeader>}
            {isColumnVisible('vehicleType') && <SortableHeader field="vehicleType" currentField={sortField} direction={sortDirection} onSort={handleSort}>Fahrzeug</SortableHeader>}
            {isColumnVisible('carImage') && <TableHead className="font-bold whitespace-nowrap bg-muted dark:bg-muted">Bild</TableHead>}
            {isColumnVisible('orderDate') && <SortableHeader field="orderDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>Bestelldatum</SortableHeader>}
            {isColumnVisible('country') && <SortableHeader field="country" currentField={sortField} direction={sortDirection} onSort={handleSort}>Land</SortableHeader>}
            {isColumnVisible('model') && <SortableHeader field="model" currentField={sortField} direction={sortDirection} onSort={handleSort}>Model</SortableHeader>}
            {isColumnVisible('range') && <SortableHeader field="range" currentField={sortField} direction={sortDirection} onSort={handleSort}>Reichweite</SortableHeader>}
            {isColumnVisible('drive') && <SortableHeader field="drive" currentField={sortField} direction={sortDirection} onSort={handleSort}>Antrieb</SortableHeader>}
            {isColumnVisible('color') && <SortableHeader field="color" currentField={sortField} direction={sortDirection} onSort={handleSort}>Farbe</SortableHeader>}
            {isColumnVisible('interior') && <SortableHeader field="interior" currentField={sortField} direction={sortDirection} onSort={handleSort}>Innen</SortableHeader>}
            {isColumnVisible('wheels') && <SortableHeader field="wheels" currentField={sortField} direction={sortDirection} onSort={handleSort}>Felgen</SortableHeader>}
            {isColumnVisible('towHitch') && <SortableHeader field="towHitch" currentField={sortField} direction={sortDirection} onSort={handleSort}>AHK</SortableHeader>}
            {isColumnVisible('autopilot') && <SortableHeader field="autopilot" currentField={sortField} direction={sortDirection} onSort={handleSort}>Autopilot</SortableHeader>}
            {isColumnVisible('deliveryWindow') && <SortableHeader field="deliveryWindow" currentField={sortField} direction={sortDirection} onSort={handleSort}>Lieferfenster</SortableHeader>}
            {isColumnVisible('deliveryLocation') && <SortableHeader field="deliveryLocation" currentField={sortField} direction={sortDirection} onSort={handleSort}>Ort</SortableHeader>}
            {isColumnVisible('vin') && <SortableHeader field="vin" currentField={sortField} direction={sortDirection} onSort={handleSort}>VIN</SortableHeader>}
            {isColumnVisible('vinReceivedDate') && <SortableHeader field="vinReceivedDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>VIN am</SortableHeader>}
            {isColumnVisible('papersReceivedDate') && <SortableHeader field="papersReceivedDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>Papiere am</SortableHeader>}
            {isColumnVisible('productionDate') && <SortableHeader field="productionDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>Produktion</SortableHeader>}
            {isColumnVisible('typeApproval') && <SortableHeader field="typeApproval" currentField={sortField} direction={sortDirection} onSort={handleSort}>Typgen.</SortableHeader>}
            {isColumnVisible('typeVariant') && <SortableHeader field="typeVariant" currentField={sortField} direction={sortDirection} onSort={handleSort}>Typ-Var.</SortableHeader>}
            {isColumnVisible('deliveryDate') && <SortableHeader field="deliveryDate" currentField={sortField} direction={sortDirection} onSort={handleSort}>Lieferdatum</SortableHeader>}
            {isColumnVisible('orderToProduction') && <SortableHeader field="orderToProduction" currentField={sortField} direction={sortDirection} onSort={handleSort}>B→P</SortableHeader>}
            {isColumnVisible('orderToVin') && <SortableHeader field="orderToVin" currentField={sortField} direction={sortDirection} onSort={handleSort}>B→VIN</SortableHeader>}
            {isColumnVisible('orderToDelivery') && <SortableHeader field="orderToDelivery" currentField={sortField} direction={sortDirection} onSort={handleSort}>B→L</SortableHeader>}
            {isColumnVisible('orderToPapers') && <SortableHeader field="orderToPapers" currentField={sortField} direction={sortDirection} onSort={handleSort}>B→Pap</SortableHeader>}
            {isColumnVisible('papersToDelivery') && <SortableHeader field="papersToDelivery" currentField={sortField} direction={sortDirection} onSort={handleSort}>Pap→L</SortableHeader>}
            {isColumnVisible('updatedAt') && <SortableHeader field="updatedAt" currentField={sortField} direction={sortDirection} onSort={handleSort}>Änderung</SortableHeader>}
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
              <TableCell colSpan={visibleColumns.size + (isAdmin ? 1 : 0)} className="text-center py-8 text-muted-foreground">
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
                {isColumnVisible('status') && (
                  <TableCell className="whitespace-nowrap">
                    <OrderProgressBar order={order} compact />
                  </TableCell>
                )}
                {isColumnVisible('name') && (
                  <TableCell className="font-medium whitespace-nowrap">{order.name}</TableCell>
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
                {isColumnVisible('orderToProduction') && (
                  <TableCell className="whitespace-nowrap text-center font-mono">
                    {order.orderToProduction !== null ? order.orderToProduction : '-'}
                  </TableCell>
                )}
                {isColumnVisible('orderToVin') && (
                  <TableCell className="whitespace-nowrap text-center font-mono">
                    {order.orderToVin !== null ? order.orderToVin : '-'}
                  </TableCell>
                )}
                {isColumnVisible('orderToDelivery') && (
                  <TableCell className="whitespace-nowrap text-center font-mono">
                    {order.orderToDelivery !== null ? order.orderToDelivery : '-'}
                  </TableCell>
                )}
                {isColumnVisible('orderToPapers') && (
                  <TableCell className="whitespace-nowrap text-center font-mono">
                    {order.orderToPapers !== null ? order.orderToPapers : '-'}
                  </TableCell>
                )}
                {isColumnVisible('papersToDelivery') && (
                  <TableCell className="whitespace-nowrap text-center font-mono">
                    {order.papersToDelivery !== null ? order.papersToDelivery : '-'}
                  </TableCell>
                )}
                {isColumnVisible('updatedAt') && (
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatRelativeTime(order.updatedAt)}
                  </TableCell>
                )}
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

      {/* Car image modal */}
      <Dialog open={!!imageModalOrder} onOpenChange={(open) => { if (!open) setImageModalOrder(null) }}>
        <DialogContent className="max-w-md p-4" aria-describedby={undefined}>
          <VisuallyHidden>
            <DialogTitle>Fahrzeugbild</DialogTitle>
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
                {imageModalOrder.model ? ` ${imageModalOrder.model}` : ''}
                {imageModalOrder.color ? ` · ${imageModalOrder.color}` : ''}
                {imageModalOrder.wheels ? ` · ${imageModalOrder.wheels}"` : ''}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
