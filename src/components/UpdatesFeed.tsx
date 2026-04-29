'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useIsMobile } from '@/hooks/useIsMobile'

const ALL_EVENT_TYPES = ['vin', 'production', 'papers', 'delivery', 'window', 'created'] as const
type EventType = (typeof ALL_EVENT_TYPES)[number]

const EVENT_FILTER_KEY = 'tesla-tracker-feed-events'

export interface FeedEntry {
  id: string
  orderId: string
  orderName: string
  country: string | null
  vehicleType: string
  eventType: EventType
  oldValue: string | null
  newValue: string | null
  changedAt: string
}

interface UpdatesFeedProps {
  globalFilters: { countries: string[]; vehicleType: string | 'all' }
  onOrderClick: (orderId: string) => void
}

function formatRelativeTime(iso: string, t: (k: string, v?: Record<string, string | number | Date>) => string): string {
  const d = new Date(iso)
  const diffMin = Math.max(1, Math.floor((Date.now() - d.getTime()) / 60000))
  if (diffMin < 60) return t('time.minutesAgo', { n: diffMin })
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return t('time.hoursAgo', { n: diffHour })
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay === 1) return t('time.yesterday')
  if (diffDay < 7) return t('time.daysAgo', { n: diffDay })
  return t('time.weeksAgo', { n: Math.floor(diffDay / 7) })
}

function bucketOf(iso: string): 'today' | 'yesterday' | 'week' | 'older' {
  const d = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86_400_000
  const sevenAgo = startOfToday - 7 * 86_400_000
  const t = d.getTime()
  if (t >= startOfToday) return 'today'
  if (t >= startOfYesterday) return 'yesterday'
  if (t >= sevenAgo) return 'week'
  return 'older'
}

function eventColorHex(e: EventType): string {
  switch (e) {
    case 'vin': return '#3b82f6'        // blue-500
    case 'production': return '#f59e0b' // amber-500
    case 'papers': return '#a855f7'     // purple-500
    case 'delivery': return '#10b981'   // emerald-500
    case 'window': return '#0ea5e9'     // sky-500
    case 'created': return '#64748b'    // slate-500
  }
}

const POLL_MS = 60_000

export function UpdatesFeed({ globalFilters, onOrderClick }: UpdatesFeedProps) {
  const t = useTranslations('updatesFeed')
  const isMobile = useIsMobile()
  const [expanded, setExpanded] = useState(true)
  const [entries, setEntries] = useState<FeedEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [enabledEvents, setEnabledEvents] = useState<Set<EventType>>(new Set(ALL_EVENT_TYPES))
  const [hydrated, setHydrated] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Set initial collapsed state from isMobile, once
  useEffect(() => { setExpanded(!isMobile) }, [isMobile])

  // Hydrate event filter from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(EVENT_FILTER_KEY)
      if (raw) {
        const arr = JSON.parse(raw) as string[]
        const next = new Set<EventType>()
        for (const e of arr) if ((ALL_EVENT_TYPES as readonly string[]).includes(e)) next.add(e as EventType)
        if (next.size > 0) setEnabledEvents(next)
      }
    } catch {}
    setHydrated(true)
  }, [])

  // Persist event filter
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(EVENT_FILTER_KEY, JSON.stringify([...enabledEvents])) } catch {}
  }, [enabledEvents, hydrated])

  const buildUrl = useCallback((cursor: string | null) => {
    const p = new URLSearchParams()
    p.set('limit', '50')
    if (cursor) p.set('cursor', cursor)
    if (globalFilters.countries.length > 0) p.set('country', globalFilters.countries.join(','))
    if (globalFilters.vehicleType !== 'all') p.set('vehicleType', globalFilters.vehicleType)
    if (enabledEvents.size < ALL_EVENT_TYPES.length) p.set('events', [...enabledEvents].join(','))
    return `/api/orders/history?${p.toString()}`
  }, [globalFilters, enabledEvents])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(buildUrl(null), { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { entries: FeedEntry[]; nextCursor: string | null }
      setEntries(data.entries)
      setNextCursor(data.nextCursor)
    } finally {
      setLoading(false)
    }
  }, [buildUrl])

  // Refetch on filter change (debounced) + initial load
  useEffect(() => {
    if (!hydrated) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { void refresh() }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [refresh, hydrated])

  // Poll
  useEffect(() => {
    if (!hydrated) return
    const id = setInterval(() => { void refresh() }, POLL_MS)
    return () => clearInterval(id)
  }, [refresh, hydrated])

  const loadMore = useCallback(async () => {
    if (!nextCursor) return
    setLoading(true)
    try {
      const res = await fetch(buildUrl(nextCursor), { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { entries: FeedEntry[]; nextCursor: string | null }
      setEntries((prev) => [...prev, ...data.entries])
      setNextCursor(data.nextCursor)
    } finally {
      setLoading(false)
    }
  }, [buildUrl, nextCursor])

  const toggleEvent = useCallback((e: EventType) => {
    setEnabledEvents((prev) => {
      const next = new Set(prev)
      if (next.has(e)) next.delete(e); else next.add(e)
      // Don't allow empty set (would be meaningless); restore all if user clears the last one
      if (next.size === 0) return new Set(ALL_EVENT_TYPES)
      return next
    })
  }, [])

  const grouped = entries.reduce<Record<'today'|'yesterday'|'week'|'older', FeedEntry[]>>(
    (acc, e) => { acc[bucketOf(e.changedAt)].push(e); return acc },
    { today: [], yesterday: [], week: [], older: [] },
  )

  return (
    <section aria-label={t('title')} className="container mx-auto px-4 py-4">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-between px-4 py-3 font-semibold"
          aria-expanded={expanded}
        >
          <span>{t('title')} {entries.length > 0 && <span className="ml-2 rounded-full bg-muted px-2 text-xs">{entries.length}</span>}</span>
          <span aria-hidden>{expanded ? '−' : '+'}</span>
        </button>
        {expanded && (
          <div className="border-t px-4 py-3 space-y-4">
            {/* event filter chips — Task 9 */}
            {entries.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">{t('empty')}</p>
            )}
            {(['today','yesterday','week','older'] as const).map((bucket) => {
              const items = grouped[bucket]
              if (items.length === 0) return null
              return (
                <div key={bucket}>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{t(`bucket.${bucket}`)}</h3>
                  <ul className="space-y-1">
                    {items.map(e => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => onOrderClick(e.orderId)}
                          className="flex w-full items-center gap-3 rounded px-2 py-1.5 text-left hover:bg-muted/60"
                          aria-label={`${e.orderName}: ${t(`event.${e.eventType}`)}, ${formatRelativeTime(e.changedAt, t)}`}
                        >
                          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: eventColorHex(e.eventType) }} aria-hidden />
                          <span className="font-medium">{e.orderName}</span>
                          <span className="text-sm text-muted-foreground">{t(`event.${e.eventType}`)}</span>
                          {e.eventType === 'window' && e.newValue && (
                            <span className="text-xs text-muted-foreground">→ {e.newValue}</span>
                          )}
                          <span className="ml-auto text-xs text-muted-foreground">{formatRelativeTime(e.changedAt, t)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {nextCursor && (
              <button type="button" onClick={loadMore} disabled={loading} className="text-sm text-primary underline">
                {loading ? t('loading') : t('loadMore')}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
