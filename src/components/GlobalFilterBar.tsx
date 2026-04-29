'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Order, VehicleType, VEHICLE_TYPES, COLORS, DRIVES, WHEELS, INTERIORS, RANGES, MODEL_Y_TRIMS, MODEL_3_TRIMS, MODEL_S_TRIMS, MODEL_X_TRIMS, CYBERTRUCK_TRIMS, ROADSTER_TRIMS, COUNTRIES } from '@/lib/types'
import { getAvailablePeriods, StatsPeriod } from '@/lib/statistics'
import { FilterCollapse } from '@/components/FilterCollapse'
import { TwemojiEmoji } from '@/components/TwemojiText'
import { Badge } from '@/components/ui/badge'
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

  return (
    <div className="flex flex-col gap-2 bg-muted/30 rounded-xl p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-4 w-full">
        <FilterCollapse activeCount={totalActiveCount}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 w-full">
            {/* Vehicle Type */}
            <Select
              value={filters.vehicle}
              onValueChange={(value) => onChange({ ...filters, vehicle: value as VehicleType | 'all' })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('vehicleSelect')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('vehicle')}: {tc('all')}</SelectItem>
                {VEHICLE_TYPES.map((vt) => (
                  <SelectItem key={vt.value} value={vt.value}>
                    {vt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Period */}
            <Select
              value={periodToKey(filters.period)}
              onValueChange={(key) => onChange({ ...filters, period: keyToPeriod(key) })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('periodSelect')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTime')}</SelectItem>
                {availablePeriods.years.length > 0 && (
                  <>
                    {availablePeriods.years.map((year) => (
                      <SelectItem key={`year-${year}`} value={`year-${year}`}>
                        {t('year', { year })}
                      </SelectItem>
                    ))}
                  </>
                )}
                {availablePeriods.quarters.length > 0 && (
                  <>
                    {availablePeriods.quarters.map(({ year, quarter }) => (
                      <SelectItem
                        key={`quarter-${year}-${quarter}`}
                        value={`quarter-${year}-${quarter}`}
                      >
                        {formatQuarter(year, quarter)}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Model */}
            {filterOptions.modelOptions.length > 1 && (
              <Select
                value={filters.model || '_all'}
                onValueChange={(v) => onChange({ ...filters, model: v === '_all' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('modelDistribution')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('modelDistribution')}: {tc('all')}</SelectItem>
                  {filterOptions.modelOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Range (Reichweite) */}
            {filterOptions.rangeOptions.length > 1 && (
              <Select
                value={filters.range || '_all'}
                onValueChange={(v) => onChange({ ...filters, range: v === '_all' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('rangeDistribution')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('rangeDistribution')}: {tc('all')}</SelectItem>
                  {filterOptions.rangeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Color */}
            {filterOptions.colorOptions.length > 1 && (
              <Select
                value={filters.color || '_all'}
                onValueChange={(v) => onChange({ ...filters, color: v === '_all' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('colorDistribution')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('colorDistribution')}: {tc('all')}</SelectItem>
                  {filterOptions.colorOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        {COLORS.find(c => c.value === o.value)?.hex && (
                          <span
                            className="w-3 h-3 rounded-full inline-block shrink-0 border border-border"
                            style={{ backgroundColor: COLORS.find(c => c.value === o.value)?.hex }}
                          />
                        )}
                        {o.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Drive */}
            {filterOptions.driveOptions.length > 1 && (
              <Select
                value={filters.drive || '_all'}
                onValueChange={(v) => onChange({ ...filters, drive: v === '_all' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('driveDistribution')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('driveDistribution')}: {tc('all')}</SelectItem>
                  {filterOptions.driveOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Wheels */}
            {filterOptions.wheelsOptions.length > 1 && (
              <Select
                value={filters.wheels || '_all'}
                onValueChange={(v) => onChange({ ...filters, wheels: v === '_all' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('wheelsDistribution')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('wheelsDistribution')}: {tc('all')}</SelectItem>
                  {filterOptions.wheelsOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Interior */}
            {filterOptions.interiorOptions.length > 1 && (
              <Select
                value={filters.interior || '_all'}
                onValueChange={(v) => onChange({ ...filters, interior: v === '_all' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('interiorDistribution')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('interiorDistribution')}: {tc('all')}</SelectItem>
                  {filterOptions.interiorOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Country */}
            {filterOptions.countryOptions.length > 1 && (
              <Select
                value={filters.country || '_all'}
                onValueChange={(v) => onChange({ ...filters, country: v === '_all' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('countryDistribution')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('countryDistribution')}: {tc('all')}</SelectItem>
                  {filterOptions.countryOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        {o.flag && <TwemojiEmoji emoji={o.flag} size={16} />}
                        {o.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Delivery Location */}
            {filterOptions.deliveryLocationOptions.length > 1 && (
              <Select
                value={filters.deliveryLocation || '_all'}
                onValueChange={(v) => onChange({ ...filters, deliveryLocation: v === '_all' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tt('deliveryLocation')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{tt('deliveryLocation')}: {tc('all')}</SelectItem>
                  {filterOptions.deliveryLocationOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Clear Filters */}
          {totalActiveCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-2"
            >
              <X className="h-3 w-3" />
              {tc('reset')}
            </button>
          )}
        </FilterCollapse>

        {/* Active filters indicator */}
        {totalActiveCount > 0 && (
          <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700">
            <Filter className="h-3 w-3 mr-1" />
            {totalActiveCount} {totalActiveCount === 1 ? 'Filter' : 'Filter'}
          </Badge>
        )}
      </div>
    </div>
  )
}
