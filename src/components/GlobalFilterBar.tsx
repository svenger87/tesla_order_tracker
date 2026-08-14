'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Order, VehicleType, VEHICLE_TYPES, COLORS, DRIVES, WHEELS, INTERIORS, RANGES, MODEL_Y_TRIMS, MODEL_3_TRIMS, MODEL_S_TRIMS, MODEL_X_TRIMS, CYBERTRUCK_TRIMS, ROADSTER_TRIMS, COUNTRIES } from '@/lib/types'
import { getAvailablePeriods, StatsPeriod } from '@/lib/statistics'
import { TwemojiEmoji } from '@/components/TwemojiText'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter, X } from 'lucide-react'

export interface GlobalFilters {
  vehicle: VehicleType | 'all'
  period: StatsPeriod
  model: string
  range: string
  color: string
  drive: string
  wheels: string
  interior: string
  country: string
  deliveryLocation: string
}

export const defaultGlobalFilters: GlobalFilters = {
  vehicle: 'all',
  period: { type: 'all' },
  model: '',
  range: '',
  color: '',
  drive: '',
  wheels: '',
  interior: '',
  country: '',
  deliveryLocation: '',
}

interface GlobalFilterBarProps {
  orders: Order[]  // raw orders, to compute available options
  filters: GlobalFilters
  onChange: (filters: GlobalFilters) => void
}

// Convert period to string key for select
function periodToKey(period: StatsPeriod): string {
  if (period.type === 'all') return 'all'
  if (period.type === 'year') return `year-${period.year}`
  if (period.type === 'quarter') return `quarter-${period.year}-${period.quarter}`
  return 'all'
}

// Convert string key back to period
export function keyToPeriod(key: string): StatsPeriod {
  if (key === 'all') return { type: 'all' }
  if (key.startsWith('year-')) {
    const year = parseInt(key.split('-')[1])
    return { type: 'year', year }
  }
  if (key.startsWith('quarter-')) {
    const parts = key.split('-')
    return { type: 'quarter', year: parseInt(parts[1]), quarter: parseInt(parts[2]) }
  }
  return { type: 'all' }
}

// Format quarter label
function formatQuarter(year: number, quarter: number): string {
  return `Q${quarter} ${year}`
}

export function GlobalFilterBar({ orders, filters, onChange }: GlobalFilterBarProps) {
  const t = useTranslations('statistics')
  const tc = useTranslations('common')
  const tt = useTranslations('table')

  const availablePeriods = useMemo(() => getAvailablePeriods(orders), [orders])

  // Build available filter options from actual order data
  const filterOptions = useMemo(() => {
    const models = new Set<string>()
    const ranges = new Set<string>()
    const colors = new Set<string>()
    const drives = new Set<string>()
    const wheels = new Set<string>()
    const interiors = new Set<string>()
    const countryCodes = new Set<string>()
    const deliveryLocations = new Set<string>()
    orders.forEach(o => {
      if (o.model) models.add(o.model)
      if (o.range) ranges.add(o.range)
      if (o.color) colors.add(o.color)
      if (o.drive) drives.add(o.drive)
      if (o.wheels) wheels.add(o.wheels)
      if (o.interior) interiors.add(o.interior)
      if (o.country) countryCodes.add(o.country)
      if (o.deliveryLocation) deliveryLocations.add(o.deliveryLocation)
    })

    const allTrims = [...MODEL_Y_TRIMS, ...MODEL_3_TRIMS, ...MODEL_S_TRIMS, ...MODEL_X_TRIMS, ...CYBERTRUCK_TRIMS, ...ROADSTER_TRIMS]
    const modelOptions = Array.from(models).map(v => {
      const trim = allTrims.find(t => t.value === v)
      return { value: v, label: trim?.label || v }
    }).sort((a, b) => a.label.localeCompare(b.label))

    const rangeOptions = Array.from(ranges).map(v => {
      const r = RANGES.find(r => r.value === v)
      return { value: v, label: r?.label || v }
    }).sort((a, b) => a.label.localeCompare(b.label))

    const colorOptions = Array.from(colors).map(v => {
      const c = COLORS.find(c => c.value === v)
      return { value: v, label: c?.label || v }
    }).sort((a, b) => a.label.localeCompare(b.label))

    const driveOptions = Array.from(drives).map(v => {
      const d = DRIVES.find(d => d.value === v)
      return { value: v, label: d?.label || v }
    }).sort((a, b) => a.label.localeCompare(b.label))

    const wheelsOptions = Array.from(wheels).map(v => {
      const w = WHEELS.find(w => w.value === v)
      return { value: v, label: w?.label || v }
    }).sort((a, b) => a.label.localeCompare(b.label))

    const interiorOptions = Array.from(interiors).map(v => {
      const i = INTERIORS.find(i => i.value === v)
      return { value: v, label: i?.label || v }
    }).sort((a, b) => a.label.localeCompare(b.label))

    const countryOptions = Array.from(countryCodes).map(v => {
      const c = COUNTRIES.find(c => c.value === v)
      return { value: v, label: c?.label || v, flag: c?.flag }
    }).sort((a, b) => a.label.localeCompare(b.label))

    const deliveryLocationOptions = Array.from(deliveryLocations)
      .sort((a, b) => a.localeCompare(b))
      .map(v => ({ value: v, label: v }))

    return { modelOptions, rangeOptions, colorOptions, driveOptions, wheelsOptions, interiorOptions, countryOptions, deliveryLocationOptions }
  }, [orders])

  const activeFilterCount = [filters.model, filters.range, filters.color, filters.drive, filters.wheels, filters.interior, filters.country, filters.deliveryLocation].filter(v => v !== '').length
  // Count vehicle + period as active if not default
  const totalActiveCount = activeFilterCount
    + (filters.vehicle !== 'all' ? 1 : 0)
    + (filters.period.type !== 'all' ? 1 : 0)

  const clearFilters = () => onChange(defaultGlobalFilters)

  /**
   * Configuration filters, described once instead of eight near-identical
   * Select blocks. They live behind one button now: ten dropdowns sat directly
   * under the page headline, which made the least interesting thing on the page
   * the second thing you saw, and cost about 150px before any data appeared.
   * Whatever is set stays visible as a chip, so folding them away does not hide
   * that a filter is on.
   */
  const configFilters = [
    { key: 'model' as const, label: t('modelDistribution'), options: filterOptions.modelOptions },
    { key: 'range' as const, label: t('rangeDistribution'), options: filterOptions.rangeOptions },
    { key: 'color' as const, label: t('colorDistribution'), options: filterOptions.colorOptions },
    { key: 'drive' as const, label: t('driveDistribution'), options: filterOptions.driveOptions },
    { key: 'wheels' as const, label: t('wheelsDistribution'), options: filterOptions.wheelsOptions },
    { key: 'interior' as const, label: t('interiorDistribution'), options: filterOptions.interiorOptions },
    { key: 'country' as const, label: t('countryDistribution'), options: filterOptions.countryOptions },
    { key: 'deliveryLocation' as const, label: tt('deliveryLocation'), options: filterOptions.deliveryLocationOptions },
  ].filter(f => f.options.length > 1)

  const activeConfig = configFilters.filter(f => filters[f.key])

  const labelFor = (key: typeof configFilters[number]['key']) => {
    const def = configFilters.find(f => f.key === key)
    return def?.options.find(o => o.value === filters[key])?.label ?? filters[key]
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.vehicle}
        onValueChange={(value) => onChange({ ...filters, vehicle: value as VehicleType | 'all' })}
      >
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder={t('vehicleSelect')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('vehicle')}: {tc('all')}</SelectItem>
          {VEHICLE_TYPES.map((vt) => (
            <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={periodToKey(filters.period)}
        onValueChange={(key) => onChange({ ...filters, period: keyToPeriod(key) })}
      >
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder={t('periodSelect')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allTime')}</SelectItem>
          {availablePeriods.years.map((year) => (
            <SelectItem key={`year-${year}`} value={`year-${year}`}>{t('year', { year })}</SelectItem>
          ))}
          {availablePeriods.quarters.map(({ year, quarter }) => (
            <SelectItem key={`quarter-${year}-${quarter}`} value={`quarter-${year}-${quarter}`}>
              {formatQuarter(year, quarter)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {configFilters.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Filter className="h-4 w-4" />
              {tc('filter')}
              {activeConfig.length > 0 && (
                <span className="rounded-full bg-foreground px-1.5 text-[10px] font-semibold text-background tabular-nums">
                  {activeConfig.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[280px] p-3">
            <div className="grid gap-2">
              {configFilters.map(({ key, label, options }) => (
                <Select
                  key={key}
                  value={filters[key] || '_all'}
                  onValueChange={(v) => onChange({ ...filters, [key]: v === '_all' ? '' : v })}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder={label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">{label}: {tc('all')}</SelectItem>
                    {options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {'flag' in o && o.flag ? (
                          <span className="flex items-center gap-2">
                            <TwemojiEmoji emoji={o.flag as string} size={16} />
                            {o.label}
                          </span>
                        ) : o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {activeConfig.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange({ ...filters, [key]: '' })}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="text-foreground">{labelFor(key)}</span>
          <span className="sr-only">{label}</span>
          <X className="h-3 w-3" />
        </button>
      ))}

      {totalActiveCount > 0 && (
        <button
          onClick={clearFilters}
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3 w-3" />
          {tc('reset')}
        </button>
      )}
    </div>
  )
}
