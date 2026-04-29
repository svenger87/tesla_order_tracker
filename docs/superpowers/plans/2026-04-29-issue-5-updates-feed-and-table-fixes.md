# Issue #5 — Updates Feed & Table Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship issue #5 in one PR: a polled "Updates Feed" above the order table, plus two table UX fixes (column-visibility persistence, column-width stability).

**Architecture:** Add an additive `OrderHistory` audit table written from a single `recordOrderChanges` helper invoked from each order create/update endpoint. A new `/api/orders/history` endpoint feeds a polling `<UpdatesFeed>` React component placed above the table. Two targeted edits to `OrderTable.tsx` fix the persistence and width bugs.

**Tech stack:** Next.js 16 App Router, Prisma 7 + better-sqlite3, React 19, next-intl, Tailwind 4. **No test framework is present in this repo;** verification is by `npm run lint`, `npm run build`, dev-server smoke tests, and direct SQLite inspection. Adding a test framework is out of scope.

**Spec:** see `docs/superpowers/specs/2026-04-29-issue-5-updates-feed-and-table-fixes-design.md`.

---

## File map

| File | Purpose | Change |
|---|---|---|
| `prisma/schema.prisma` | DB schema | Add `OrderHistory` + relation |
| `src/lib/order-history.ts` | Audit helper | **new** |
| `src/app/api/orders/route.ts` | POST create / PUT edit (manual) | Hook |
| `src/app/api/v1/orders/route.ts` | API v1 create | Hook |
| `src/app/api/v1/orders/[id]/route.ts` | API v1 edit | Hook |
| `src/app/api/v1/tost/orders/route.ts` | TOST batch | Hook (`source:'tost'`) |
| `src/app/api/v1/tost/orders/[id]/route.ts` | TOST single | Hook (`source:'tost'`) |
| `src/app/api/orders/sync/route.ts` | Sheets sync (Y) | Hook (`source:'tost'`) |
| `src/app/api/orders/sync-m3/route.ts` | Sheets sync (3) | Hook (`source:'tost'`) |
| `src/app/api/orders/history/route.ts` | Feed API | **new** |
| `src/components/UpdatesFeed.tsx` | Feed UI | **new** |
| `src/app/[locale]/page.tsx` | Mount feed + wire click | Edit |
| `src/components/OrderTable.tsx` | Bug fixes 5 + 6 | Edit |
| `messages/*.json` (23 files) | Translations | Add `updatesFeed.*` |

---

## Task 1: Add `OrderHistory` schema and regenerate Prisma client

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the model and reverse relation**

In `prisma/schema.prisma`, add a `history` field to the existing `Order` model right above `@@index([name, orderDate])`:

```prisma
  history               OrderHistory[]
```

Then append at the end of the file (after `CompositorCode`):

```prisma
model OrderHistory {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  field     String
  oldValue  String?
  newValue  String?
  source    String?
  changedAt DateTime @default(now())

  @@index([changedAt])
  @@index([orderId, changedAt])
  @@index([field, changedAt])
}
```

- [ ] **Step 2: Push schema and regenerate client**

Run:
```
npx prisma db push
npx prisma generate
```
Expected output: "Your database is now in sync with your Prisma schema." then "Generated Prisma Client".

- [ ] **Step 3: Verify the table exists**

Run:
```
sqlite3 prisma/dev.db ".schema OrderHistory"
```
Expected: a `CREATE TABLE OrderHistory` statement listing all columns above.

(If the project's local dev DB lives elsewhere, substitute the actual path. Use `npx prisma studio` as a fallback to confirm visually.)

- [ ] **Step 4: Commit**

```
git add prisma/schema.prisma
git commit -m "feat(db): add OrderHistory audit table"
```

---

## Task 2: Implement the `recordOrderChanges` helper

**Files:**
- Create: `src/lib/order-history.ts`

- [ ] **Step 1: Write the helper**

```ts
// src/lib/order-history.ts
import { prisma } from '@/lib/db'
import type { Prisma, Order } from '@/generated/prisma/client'

/**
 * Fields whose changes we record for the Updates Feed.
 * Add to TRACKED_FIELDS to expand the feed surface area.
 */
export const TRACKED_FIELDS = [
  'vinReceivedDate',
  'productionDate',
  'papersReceivedDate',
  'deliveryDate',
  'deliveryWindow',
] as const

export type TrackedField = (typeof TRACKED_FIELDS)[number]

type OrderLike = Partial<Order>

function normalize(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s.length === 0 ? null : s
}

export interface RecordChangesOpts {
  source?: 'tost' | null
  tx?: Prisma.TransactionClient
}

/**
 * Records changes for a single order.
 * - before === null → emits a synthetic `_created` row.
 * - Otherwise diffs TRACKED_FIELDS and emits one row per actual change.
 * Safe to call inside a transaction by passing opts.tx.
 */
export async function recordOrderChanges(
  orderId: string,
  before: OrderLike | null,
  after: OrderLike,
  opts: RecordChangesOpts = {},
): Promise<void> {
  const client = opts.tx ?? prisma
  const source = opts.source ?? null

  if (before === null) {
    await client.orderHistory.create({
      data: {
        orderId,
        field: '_created',
        oldValue: null,
        newValue: normalize((after as { name?: unknown }).name),
        source,
      },
    })
    return
  }

  const rows: Prisma.OrderHistoryCreateManyInput[] = []
  for (const f of TRACKED_FIELDS) {
    const oldV = normalize((before as Record<string, unknown>)[f])
    const newV = normalize((after as Record<string, unknown>)[f])
    if (oldV === newV) continue
    rows.push({ orderId, field: f, oldValue: oldV, newValue: newV, source })
  }
  if (rows.length > 0) {
    await client.orderHistory.createMany({ data: rows })
  }
}
```

- [ ] **Step 2: Type-check**

Run:
```
npx tsc --noEmit
```
Expected: no errors. If `@/generated/prisma/client` import path differs (the repo uses `output = "../src/generated/prisma"`), use the path that already works for `prisma` in `src/lib/db.ts`. Open `src/lib/db.ts` to confirm.

- [ ] **Step 3: Commit**

```
git add src/lib/order-history.ts
git commit -m "feat: add recordOrderChanges audit helper"
```

---

## Task 3: Hook create endpoints

**Files:**
- Modify: `src/app/api/orders/route.ts` (around line 280, after `prisma.order.create`)
- Modify: `src/app/api/v1/orders/route.ts` (around line 148, after `prisma.order.create`)

- [ ] **Step 1: `src/app/api/orders/route.ts`**

After the line `const order = await prisma.order.create({ ... })` near line 280, add:

```ts
import { recordOrderChanges } from '@/lib/order-history'
// ... at top of file with other imports

// after the create call:
await recordOrderChanges(order.id, null, order)
```

(Don't wrap in try/catch — let it surface so we notice if the audit write fails. The endpoint already returns inside a try block.)

- [ ] **Step 2: `src/app/api/v1/orders/route.ts`**

After `const order = await prisma.order.create({ ... })` near line 148, add the same import + call:

```ts
await recordOrderChanges(order.id, null, order)
```

- [ ] **Step 3: Smoke test**

Start dev server: `npm run dev`. Submit a new order via the form at `/new`. Then:
```
sqlite3 prisma/dev.db "SELECT field, newValue, source, changedAt FROM OrderHistory ORDER BY changedAt DESC LIMIT 1"
```
Expected: one row with `field=_created`, `newValue=<order name>`, `source=NULL`.

- [ ] **Step 4: Commit**

```
git add src/app/api/orders/route.ts src/app/api/v1/orders/route.ts
git commit -m "feat(audit): record _created event on new orders"
```

---

## Task 4: Hook manual edit endpoints

**Files:**
- Modify: `src/app/api/orders/route.ts` PUT handler (lines ~320–520)
- Modify: `src/app/api/v1/orders/[id]/route.ts` PUT handler (around line 170)

The pattern: fetch the existing order **before** the update, then call `recordOrderChanges(id, before, after)` after `prisma.order.update`. Use a Prisma transaction so the audit row is atomic with the update.

- [ ] **Step 1: `src/app/api/orders/route.ts` — TOST-managed branch (line 383)**

Replace:
```ts
const updated = await prisma.order.update({ where: { id }, data: updateData })
```
with:
```ts
const updated = await prisma.$transaction(async (tx) => {
  const before = await tx.order.findUnique({ where: { id } })
  const u = await tx.order.update({ where: { id }, data: updateData })
  await recordOrderChanges(id, before, u, { source: 'tost', tx })
  return u
})
```
(This branch updates a `tost`-sourced order via webapp; tag it as `tost` since the order itself is TOST-managed.)

- [ ] **Step 2: `src/app/api/orders/route.ts` — legacy-password branch (line 422)**

Replace:
```ts
const updated = await prisma.order.update({ where: { id }, data: { ... } })
```
with:
```ts
const updated = await prisma.$transaction(async (tx) => {
  const before = await tx.order.findUnique({ where: { id } })
  const u = await tx.order.update({ where: { id }, data: { /* same data block */ } })
  await recordOrderChanges(id, before, u, { tx })
  return u
})
```

- [ ] **Step 3: `src/app/api/orders/route.ts` — main edit branch (line 488)**

Same wrap-in-transaction pattern as Step 2. `source` omitted (defaults to null = manual edit).

- [ ] **Step 4: `src/app/api/v1/orders/[id]/route.ts` (line 170)**

Same wrap-in-transaction pattern. `source` omitted.

- [ ] **Step 5: Add the import to both files**

At the top, alongside the existing `prisma` import:
```ts
import { recordOrderChanges } from '@/lib/order-history'
```

- [ ] **Step 6: Smoke test — set a VIN**

Edit an existing order (admin or via edit code) and set its `vinReceivedDate` to today. Then:
```
sqlite3 prisma/dev.db "SELECT field, oldValue, newValue, source FROM OrderHistory ORDER BY changedAt DESC LIMIT 5"
```
Expected: a row `field=vinReceivedDate, oldValue=NULL, newValue=<today>, source=NULL`.

- [ ] **Step 7: Smoke test — change a non-tracked field**

Edit the same order and change only `wheels`. Verify **no** new history row is added (only TRACKED_FIELDS are recorded).

- [ ] **Step 8: Commit**

```
git add src/app/api/orders/route.ts src/app/api/v1/orders/[id]/route.ts
git commit -m "feat(audit): record tracked field changes on order edits"
```

---

## Task 5: Hook TOST sync endpoints

**Files:**
- Modify: `src/app/api/v1/tost/orders/route.ts` (creates at line 64, 122; updates at 92, 141)
- Modify: `src/app/api/v1/tost/orders/[id]/route.ts` (update at line 103)
- Modify: `src/app/api/orders/sync/route.ts` (update 332, create 344)
- Modify: `src/app/api/orders/sync-m3/route.ts` (update 381, create 388)

**Convention:** every TOST write passes `{ source: 'tost' }`. Wrap each write in a transaction same as Task 4.

- [ ] **Step 1: TOST single create (`v1/tost/orders/route.ts:64`)**

Replace:
```ts
const order = await prisma.order.create({ data: { ... } })
```
with:
```ts
const order = await prisma.$transaction(async (tx) => {
  const created = await tx.order.create({ data: { /* same */ } })
  await recordOrderChanges(created.id, null, created, { source: 'tost', tx })
  return created
})
```

- [ ] **Step 2: TOST single update (`v1/tost/orders/route.ts:92`)**

```ts
const updated = await prisma.$transaction(async (tx) => {
  const before = await tx.order.findUnique({ where: { /* same lookup */ } })
  const u = await tx.order.update({ where: { id: before!.id }, data: { /* same */ } })
  await recordOrderChanges(u.id, before, u, { source: 'tost', tx })
  return u
})
```

- [ ] **Step 3: TOST batch loop (`v1/tost/orders/route.ts:122` and `:141`)**

The batch endpoint iterates and calls `prisma.order.create` / `.update` per row. Apply the same `$transaction` wrap to each call. (If the loop is hot, consider moving the whole loop into a single transaction; that's an optional optimization. Default: keep one transaction per row for simpler error handling.)

- [ ] **Step 4: TOST [id] route (`v1/tost/orders/[id]/route.ts:103`)**

Same wrap-in-transaction pattern.

- [ ] **Step 5: Sheets sync (`orders/sync/route.ts:332,344` and `orders/sync-m3/route.ts:381,388`)**

Same wrap-in-transaction pattern around each of the four call sites. All with `source: 'tost'`.

- [ ] **Step 6: Add imports**

In each modified file:
```ts
import { recordOrderChanges } from '@/lib/order-history'
```

- [ ] **Step 7: Smoke test**

If a sandbox TOST sync token is available locally, trigger one sync. Then:
```
sqlite3 prisma/dev.db "SELECT source, COUNT(*) FROM OrderHistory GROUP BY source"
```
Expected: a `tost` row count > 0. If no sandbox is available, skip and rely on review.

- [ ] **Step 8: Commit**

```
git add src/app/api/v1/tost/orders src/app/api/orders/sync src/app/api/orders/sync-m3
git commit -m "feat(audit): tag TOST sync changes with source=tost"
```

---

## Task 6: Implement the feed API endpoint

**Files:**
- Create: `src/app/api/orders/history/route.ts`

- [ ] **Step 1: Write the route**

```ts
// src/app/api/orders/history/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const FIELD_TO_EVENT: Record<string, string> = {
  vinReceivedDate: 'vin',
  productionDate: 'production',
  papersReceivedDate: 'papers',
  deliveryDate: 'delivery',
  deliveryWindow: 'window',
  _created: 'created',
}

const ALL_EVENTS = ['vin', 'production', 'papers', 'delivery', 'window', 'created'] as const

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 200)
  const cursor = url.searchParams.get('cursor')
  const country = url.searchParams.get('country')?.split(',').filter(Boolean) ?? null
  const vehicleType = url.searchParams.get('vehicleType')
  const eventsParam = url.searchParams.get('events')?.split(',').filter(Boolean)
  const events = (eventsParam && eventsParam.length > 0 ? eventsParam : ALL_EVENTS) as readonly string[]
  const includeTost = url.searchParams.get('includeTost') === 'true'

  const eventToFields = Object.entries(FIELD_TO_EVENT)
    .filter(([, ev]) => events.includes(ev))
    .map(([f]) => f)
  if (eventToFields.length === 0) {
    return NextResponse.json({ entries: [], nextCursor: null })
  }

  const where: import('@/generated/prisma/client').Prisma.OrderHistoryWhereInput = {
    field: { in: eventToFields },
    ...(cursor ? { changedAt: { lt: new Date(cursor) } } : {}),
    ...(includeTost ? {} : { OR: [{ source: null }, { source: { not: 'tost' } }] }),
    order: {
      archived: false,
      ...(country && country.length ? { country: { in: country } } : {}),
      ...(vehicleType ? { vehicleType } : {}),
    },
  }

  const rows = await prisma.orderHistory.findMany({
    where,
    orderBy: { changedAt: 'desc' },
    take: limit + 1,
    include: {
      order: {
        select: { id: true, name: true, country: true, vehicleType: true },
      },
    },
  })

  const sliced = rows.slice(0, limit)
  const nextCursor = rows.length > limit ? sliced[sliced.length - 1].changedAt.toISOString() : null

  const entries = sliced.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    orderName: r.order.name,
    country: r.order.country,
    vehicleType: r.order.vehicleType,
    field: r.field,
    eventType: FIELD_TO_EVENT[r.field] ?? r.field,
    oldValue: r.oldValue,
    newValue: r.newValue,
    changedAt: r.changedAt.toISOString(),
  }))

  return NextResponse.json({ entries, nextCursor })
}
```

- [ ] **Step 2: Smoke test the endpoint**

With dev server running:
```
curl 'http://localhost:3000/api/orders/history?limit=5'
```
Expected: `{"entries":[…], "nextCursor":…}` with up to 5 rows.

```
curl 'http://localhost:3000/api/orders/history?events=vin,delivery&limit=10'
```
Expected: only entries where `eventType` is `vin` or `delivery`.

- [ ] **Step 3: Commit**

```
git add src/app/api/orders/history/route.ts
git commit -m "feat(api): GET /api/orders/history feed endpoint"
```

---

## Task 7: `<UpdatesFeed>` skeleton + data fetch

**Files:**
- Create: `src/components/UpdatesFeed.tsx`

- [ ] **Step 1: Write the skeleton**

```tsx
// src/components/UpdatesFeed.tsx
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
```

- [ ] **Step 2: Type-check**

Run:
```
npx tsc --noEmit
```
Expected: passes. (`useIsMobile` already exists at `src/hooks/useIsMobile.ts`.)

- [ ] **Step 3: Commit**

```
git add src/components/UpdatesFeed.tsx
git commit -m "feat(feed): UpdatesFeed skeleton with fetch + polling"
```

---

## Task 8: `<UpdatesFeed>` rendering — entries, grouping, click

**Files:**
- Modify: `src/components/UpdatesFeed.tsx`

- [ ] **Step 1: Add a relative-time helper at the top of the file**

```ts
function formatRelativeTime(iso: string, t: (k: string, v?: Record<string, unknown>) => string): string {
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
```

- [ ] **Step 2: Replace the placeholder render with the full UI**

Replace the `return (...)` in `UpdatesFeed` with:

```tsx
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
```

- [ ] **Step 3: Add the `eventColorHex` helper above the component**

Tailwind 4 only emits CSS for class strings it sees at build time, so dynamic class names like `` `bg-${color}-500` `` won't work. Use inline `style={{ backgroundColor: ... }}` (already done in Step 2) and add this helper:

```ts
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
```

- [ ] **Step 4: Type-check**

Run `npx tsc --noEmit`. Expected: passes.

- [ ] **Step 5: Commit**

```
git add src/components/UpdatesFeed.tsx
git commit -m "feat(feed): render grouped entries with click-to-scroll"
```

---

## Task 9: Event-type filter chips

**Files:**
- Modify: `src/components/UpdatesFeed.tsx`

- [ ] **Step 1: Insert the chip row inside the expanded panel**

Above the empty-state line and `bucket` map, add:

```tsx
<div className="flex flex-wrap gap-1.5">
  {ALL_EVENT_TYPES.map((ev) => {
    const on = enabledEvents.has(ev)
    return (
      <button
        key={ev}
        type="button"
        onClick={() => toggleEvent(ev)}
        aria-pressed={on}
        className={`rounded-full border px-2.5 py-0.5 text-xs ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border'}`}
      >
        {t(`event.${ev}`)}
      </button>
    )
  })}
</div>
```

- [ ] **Step 2: Smoke test**

Start dev server. Toggle a chip. Confirm:
- The list re-fetches.
- Refresh the page; the disabled chip stays disabled.

- [ ] **Step 3: Commit**

```
git add src/components/UpdatesFeed.tsx
git commit -m "feat(feed): event-type filter chips persisted in localStorage"
```

---

## Task 10: Mount the feed on the home page

**Files:**
- Modify: `src/app/[locale]/page.tsx`

- [ ] **Step 1: Locate the table mount point**

Open the file and find where `<OrderTable>` (or `<CollapsibleOrderSection>`) is rendered. Note the existing `globalFilters` state (loaded from `GLOBAL_FILTERS_KEY`) and any existing `scrollToOrderId` state.

- [ ] **Step 2: Add a `scrollToOrderId` state if none exists**

```tsx
const [scrollToOrderId, setScrollToOrderId] = useState<string | null>(null)
```
(If it already exists, reuse it.)

- [ ] **Step 3: Import and mount `<UpdatesFeed>` directly above the table**

```tsx
import { UpdatesFeed } from '@/components/UpdatesFeed'

// in the JSX, immediately before the table/section:
<UpdatesFeed
  globalFilters={{
    countries: globalFilters.countries ?? [],
    vehicleType: globalFilters.vehicleType ?? 'all',
  }}
  onOrderClick={(id) => setScrollToOrderId(id)}
/>
```

Adjust property reads to match the actual shape of `globalFilters` in this file (read it once, mirror its keys).

- [ ] **Step 4: Pass `scrollToOrderId` to the table**

If the table is rendered as `<OrderTable orders=… />`, add `scrollToOrderId={scrollToOrderId}`. The prop is already defined in `OrderTable.tsx:313`. If the table is wrapped in `<CollapsibleOrderSection>`, that component also already accepts and forwards `scrollToOrderId`.

- [ ] **Step 5: Smoke test**

Start dev server. Load `/`. Click a feed entry. Expected: page scrolls so the corresponding order row is visible (the existing `scrollToOrderId` logic handles this).

- [ ] **Step 6: Commit**

```
git add src/app/[locale]/page.tsx
git commit -m "feat(home): mount UpdatesFeed above order table"
```

---

## Task 11: Translation keys

**Files:**
- Modify: all 23 files under `messages/*.json`

- [ ] **Step 1: Define the canonical English keys**

Add this block to `messages/en.json` (under a new top-level `updatesFeed` key):

```json
"updatesFeed": {
  "title": "Recent updates",
  "entries": "entries",
  "loading": "Loading…",
  "loadMore": "Load more",
  "empty": "No recent updates yet.",
  "bucket": {
    "today": "Today",
    "yesterday": "Yesterday",
    "week": "This week",
    "older": "Older"
  },
  "event": {
    "vin": "VIN assigned",
    "production": "In production",
    "papers": "Papers received",
    "delivery": "Delivered",
    "window": "Delivery window changed",
    "created": "New order"
  },
  "time": {
    "minutesAgo": "{n} min ago",
    "hoursAgo": "{n} h ago",
    "yesterday": "yesterday",
    "daysAgo": "{n} d ago",
    "weeksAgo": "{n} wk ago"
  }
}
```

- [ ] **Step 2: Add German translations to `messages/de.json`**

```json
"updatesFeed": {
  "title": "Letzte Updates",
  "entries": "Einträge",
  "loading": "Laden…",
  "loadMore": "Mehr laden",
  "empty": "Noch keine Updates.",
  "bucket": {
    "today": "Heute",
    "yesterday": "Gestern",
    "week": "Diese Woche",
    "older": "Älter"
  },
  "event": {
    "vin": "VIN zugewiesen",
    "production": "In Produktion",
    "papers": "Papiere erhalten",
    "delivery": "Geliefert",
    "window": "Lieferfenster geändert",
    "created": "Neue Bestellung"
  },
  "time": {
    "minutesAgo": "vor {n} Min",
    "hoursAgo": "vor {n} Std",
    "yesterday": "gestern",
    "daysAgo": "vor {n} Tagen",
    "weeksAgo": "vor {n} Wo"
  }
}
```

- [ ] **Step 3: Other 21 locales**

For all other `messages/*.json` files, add the **same English block** as a fallback. next-intl will emit the English text where translations are missing. (Translating into 21 languages is out of scope for this PR; community contributors can fill these in via follow-up PRs.)

A quick way to do this in bash:
```
node -e '
const fs=require("fs");
const path=require("path");
const block=JSON.parse(fs.readFileSync("messages/en.json","utf8")).updatesFeed;
for (const f of fs.readdirSync("messages").filter(f=>f.endsWith(".json") && f!=="en.json" && f!=="de.json")) {
  const p=path.join("messages",f);
  const d=JSON.parse(fs.readFileSync(p,"utf8"));
  d.updatesFeed=block;
  fs.writeFileSync(p, JSON.stringify(d,null,2)+"\n");
}'
```

- [ ] **Step 4: Verify**

Run:
```
node -e 'for(const f of require("fs").readdirSync("messages")){const d=JSON.parse(require("fs").readFileSync("messages/"+f,"utf8"));console.log(f, !!d.updatesFeed)}'
```
Expected: every line ends with `true`.

- [ ] **Step 5: Commit**

```
git add messages/
git commit -m "i18n(feed): add updatesFeed translations (en + de; en fallback for others)"
```

---

## Task 12: Bug fix — column-visibility persistence

**Files:**
- Modify: `src/components/OrderTable.tsx` (storage key + load logic, lines 402–509)

- [ ] **Step 1: Bump storage key and define schema fingerprint**

Replace lines 402–403:
```ts
const COLUMNS_STORAGE_KEY = 'tesla-tracker-table-columns'
const SORT_STORAGE_KEY = 'tesla-tracker-table-sort'
```
with:
```ts
const COLUMNS_STORAGE_KEY = 'tesla-tracker-table-columns-v2'
const SORT_STORAGE_KEY = 'tesla-tracker-table-sort'
const COLUMNS_SCHEMA = COLUMN_DEFS.map(c => c.key).sort().join(',')
```

- [ ] **Step 2: Replace the load block**

Replace lines 475–492 (the column load `useEffect` body):

```ts
const savedColumns = localStorage.getItem(COLUMNS_STORAGE_KEY)
if (savedColumns) {
  try {
    const parsed = JSON.parse(savedColumns) as { visible?: string[]; schema?: string }
    if (parsed && Array.isArray(parsed.visible) && typeof parsed.schema === 'string') {
      const visible = new Set(parsed.visible)
      if (parsed.schema === COLUMNS_SCHEMA) {
        setVisibleColumns(visible)
      } else {
        // Schema changed: add ONLY columns that didn't exist when prefs were saved
        const previousKeys = new Set(parsed.schema.split(',').filter(Boolean))
        for (const c of COLUMN_DEFS) {
          if (!previousKeys.has(c.key)) visible.add(c.key)
        }
        setVisibleColumns(visible)
      }
    }
  } catch (e) {
    console.error('Failed to parse saved columns:', e)
  }
}
```

- [ ] **Step 3: Replace the save block**

Replace lines 504–509 (the save `useEffect` body):
```ts
useEffect(() => {
  if (isHydrated) {
    localStorage.setItem(
      COLUMNS_STORAGE_KEY,
      JSON.stringify({ visible: [...visibleColumns], schema: COLUMNS_SCHEMA }),
    )
  }
}, [visibleColumns, isHydrated])
```

- [ ] **Step 4: Smoke test**

Start dev server.
1. Open `/`.
2. Toggle off the "Updated" column via the column picker.
3. Hard refresh (Ctrl+Shift+R).
4. Expected: the "Updated" column stays hidden.
5. Open DevTools → Application → Local Storage. Expected: `tesla-tracker-table-columns-v2` = `{"visible":[...],"schema":"..."}` and the `updatedAt` key is *absent* from `visible`.

- [ ] **Step 5: Commit**

```
git add src/components/OrderTable.tsx
git commit -m "fix(table): hidden columns now persist across reload (#5)"
```

---

## Task 13: Bug fix — column-width stability

**Files:**
- Modify: `src/components/OrderTable.tsx` (`COLUMN_DEFS` + table render + cell content)

- [ ] **Step 1: Add `width` to `ColumnDef` and to all 30 entries**

Update the type and constant near line 354:

```ts
interface ColumnDef {
  key: string
  label: string
  group: ColumnGroup
  width: number  // px
}
```

Then update each entry in `COLUMN_DEFS`. Suggested initial widths (calibrate after Step 4):

```ts
const COLUMN_DEFS: ColumnDef[] = [
  { key: 'status',             label: 'status',             group: 'essential',     width: 120 },
  { key: 'name',               label: 'name',               group: 'essential',     width: 180 },
  { key: 'vehicleType',        label: 'vehicle',            group: 'essential',     width: 110 },
  { key: 'carImage',           label: 'image',              group: 'configuration', width: 80  },
  { key: 'orderDate',          label: 'orderDate',          group: 'essential',     width: 120 },
  { key: 'country',            label: 'country',            group: 'configuration', width: 130 },
  { key: 'model',              label: 'model',              group: 'configuration', width: 120 },
  { key: 'range',              label: 'range',              group: 'configuration', width: 130 },
  { key: 'drive',              label: 'drive',              group: 'configuration', width: 130 },
  { key: 'color',              label: 'color',              group: 'configuration', width: 150 },
  { key: 'interior',           label: 'interior',           group: 'configuration', width: 130 },
  { key: 'wheels',             label: 'wheels',             group: 'configuration', width: 100 },
  { key: 'towHitch',           label: 'towHitch',           group: 'configuration', width: 90  },
  { key: 'seats',              label: 'seats',              group: 'configuration', width: 80  },
  { key: 'autopilot',          label: 'autopilot',          group: 'configuration', width: 130 },
  { key: 'deliveryWindow',     label: 'deliveryWindow',     group: 'configuration', width: 150 },
  { key: 'deliveryLocation',   label: 'deliveryLocation',   group: 'configuration', width: 150 },
  { key: 'vin',                label: 'vin',                group: 'configuration', width: 170 },
  { key: 'vinReceivedDate',    label: 'vinDate',            group: 'configuration', width: 120 },
  { key: 'papersReceivedDate', label: 'papersDate',         group: 'configuration', width: 120 },
  { key: 'productionDate',     label: 'production',         group: 'configuration', width: 120 },
  { key: 'typeApproval',       label: 'typeApproval',       group: 'configuration', width: 120 },
  { key: 'typeVariant',        label: 'typeVariant',        group: 'configuration', width: 120 },
  { key: 'deliveryDate',       label: 'deliveryDate',       group: 'configuration', width: 120 },
  { key: 'orderToVin',         label: 'orderToVin',         group: 'detail',        width: 110 },
  { key: 'vinToProduction',    label: 'vinToProduction',    group: 'detail',        width: 110 },
  { key: 'productionToPapers', label: 'productionToPapers', group: 'detail',        width: 110 },
  { key: 'papersToDelivery',   label: 'papersToDelivery',   group: 'detail',        width: 110 },
  { key: 'orderToDelivery',    label: 'orderToDelivery',    group: 'detail',        width: 110 },
  { key: 'updatedAt',          label: 'updatedAt',          group: 'detail',        width: 130 },
]
```

- [ ] **Step 2: Add `<colgroup>` and `table-fixed` to the rendered table**

Find the `<Table>` element in the desktop render branch. Set its className to include `table-fixed`. Add a `<colgroup>` as the first child:

```tsx
<Table className="table-fixed w-max">
  <colgroup>
    <col style={{ width: 60 }} />{/* actions column (always present) */}
    {COLUMN_DEFS.filter(c => isColumnVisible(c.key)).map(c => (
      <col key={c.key} style={{ width: c.width }} />
    ))}
  </colgroup>
  ...
```

The `w-max` keeps the table wider than the viewport so horizontal scroll is preserved.

If the actions column is rendered conditionally (only for admin), filter accordingly:

```tsx
{(isAdmin || onEditByCode) && <col style={{ width: 60 }} />}
```

- [ ] **Step 3: Truncate text cells**

Audit `OrderTable.tsx` cells that render free-form text (name, deliveryLocation, vin, typeVariant, etc.). For each, wrap the value:

```tsx
<TableCell className="whitespace-nowrap">
  <span className="block truncate" title={String(value ?? '')}>{value ?? '-'}</span>
</TableCell>
```

Cells that already render a structured chip (color dot, country flag) should still wrap their text label in `truncate` + `title` so long localized labels don't break the layout.

The `whitespace-nowrap` on `TableCell` may already exist; keep it. The `truncate` class needs `overflow:hidden` + `display:block`, which is already provided by Tailwind's `truncate` utility.

- [ ] **Step 4: Verify and calibrate**

Start dev server. Load `/` with the full dataset.
1. Sort by various columns (date, name, country) — column widths should stay constant.
2. Scroll vertically with the mouse wheel — the "Updated" column position must not shift.
3. Hover any truncated cell — the native browser tooltip should show the full text.
4. If any column is too narrow (truncates obvious cases), raise its width in `COLUMN_DEFS` by 10–20 px and reload.

- [ ] **Step 5: Lint + build**

```
npm run lint
npm run build
```
Expected: both succeed.

- [ ] **Step 6: Commit**

```
git add src/components/OrderTable.tsx
git commit -m "fix(table): stabilize column widths with table-fixed + colgroup; truncate long values (#5)"
```

---

## Task 14: End-to-end smoke matrix

- [ ] **Step 1: Manual run-through**

With dev server up:
1. Submit a new order via `/new` → feed shows a "New order" entry within ~1 minute (or after manual reload).
2. Edit an existing order; set `vinReceivedDate` → feed shows "VIN assigned".
3. Edit an existing order; change `deliveryWindow` → feed shows "Delivery window changed → <new value>".
4. Edit an existing order; change `wheels` → no new feed entry.
5. Toggle the "vin" chip off → entries with eventType `vin` disappear; reload → chip stays off.
6. Apply the global country filter → feed honors it.
7. Click any feed entry → page scrolls to and highlights the corresponding row.
8. Hide the "Updated" column → reload → it stays hidden. Make it visible again → reload → it stays visible.
9. Sort by various columns → "Updated" column stays in the same x-position; long values truncate with hover tooltip.

- [ ] **Step 2: Final lint / typecheck / build**

```
npm run lint
npx tsc --noEmit
npm run build
```
Expected: all pass.

- [ ] **Step 3: Open PR**

```
gh pr create --title "Issue #5: Updates feed + table UX fixes" --body "..."
```

---

## Risks recap

- **Bulk TOST sync flooding the feed.** Mitigated by `source='tost'` + `includeTost=false` default in API.
- **Schema migration on prod SQLite.** Additive; covered by Docker template-DB build flow. After merge, the next deploy rebuilds the Docker image which runs `prisma generate` → schema baked in.
- **Column widths underspec'd for some locales.** Mitigated by `truncate` + `title`; widths can be tuned post-merge without schema impact.
- **Polling cost.** 50-row indexed query every 60 s per active client; negligible at current scale.
