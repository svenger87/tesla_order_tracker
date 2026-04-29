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

  // Render is added in Task 8.
  return (
    <section aria-label={t('title')} className="container mx-auto px-4 py-2">
      {/* placeholder — Task 8 fills this in */}
      <div>{loading ? t('loading') : `${entries.length} ${t('entries')}`}</div>
    </section>
  )
}
