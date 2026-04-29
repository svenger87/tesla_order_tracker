# Issue #5 — Updates Feed & Table UX Fixes — Design

**Date:** 2026-04-29
**Issue:** [#5](https://github.com/svenger87/tesla_order_tracker/issues/5) (tombolini, "Verbesserungsvorschlag")
**Scope:** single PR

## Goals

User feedback on the home page's order table identifies three problems:

1. There is no way to see at a glance "what changed today" across all orders.
2. Hiding columns in the table does not survive a page reload.
3. Column widths shift while scrolling/sorting; the "Updated" column drifts off-screen.

This design delivers, in one bundle:

- An **Updates Feed** above the table, surfacing recent status milestones, new orders, and delivery-window changes.
- A **fix to column-visibility persistence**.
- A **fix to column-width stability** with truncation + hover tooltip for long values.

## Out of scope

- Backfilling history for orders that already exist. The audit log starts empty; the feed will populate as edits occur. Acceptable because the existing milestone-date columns (`vinReceivedDate`, etc.) are already on each order — the feed's value is forward-looking.
- Real-time push (websockets). The feed polls every 60 s.
- Column resizing / reordering.

---

## 1. Database & audit log

New model in `prisma/schema.prisma`:

```prisma
model OrderHistory {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  field     String   // "vinReceivedDate" | "productionDate" | "papersReceivedDate"
                    // | "deliveryDate" | "deliveryWindow" | "_created"
  oldValue  String?
  newValue  String?
  source    String?  // null = manual edit, "tost" = bulk sync
  changedAt DateTime @default(now())

  @@index([changedAt])
  @@index([orderId, changedAt])
  @@index([field, changedAt])
}
```

Add reverse relation `history OrderHistory[]` on `Order`.

**Tracked fields (whitelist):** `vinReceivedDate`, `productionDate`, `papersReceivedDate`, `deliveryDate`, `deliveryWindow`. Plus a synthetic `_created` event row written when a new order is inserted.

**Why a whitelist:** keeps the table small and the feed signal clean. Adding fields later is a one-line change.

**Migration:** additive, no data migration required. `prisma db push` applies it; the existing Docker template-DB build flow propagates it on the next image build.

## 2. Audit write hook

Single helper:

```ts
// src/lib/order-history.ts
export async function recordOrderChanges(
  orderId: string,
  before: Partial<Order> | null,   // null = newly created
  after: Partial<Order>,
  opts: { source?: 'tost' | null; tx?: Prisma.TransactionClient }
): Promise<void>
```

Behavior:

- `before === null` → write one `{ field: '_created', newValue: <name> }` row.
- Otherwise diff the 5 tracked fields and write one row per actual change. Skip no-ops after string normalization (trim, treat `""` and `null` as equal).
- Run inside the same Prisma transaction as the update so the audit row is atomic with the write.

Call sites:

- `POST /api/orders` (or equivalent create endpoint)
- `PATCH /api/orders/[id]` (admin edit)
- `PATCH /api/orders/by-code/[code]` (user self-edit by code)
- TOST sync path — only if it touches the 5 tracked fields. Pass `source: 'tost'` so bulk syncs can be filtered out of the default feed view.

The implementation plan will grep the actual route/handler names; the list above reflects current expectations only.

## 3. API endpoint

`GET /api/orders/history`

Query params:

| param          | type     | default | meaning                                                    |
|----------------|----------|---------|------------------------------------------------------------|
| `limit`        | number   | 50      | max entries; capped at 200                                 |
| `cursor`       | ISO date | —       | return entries strictly older than this `changedAt`        |
| `country`      | csv      | —       | scope to these `Order.country` values                      |
| `vehicleType`  | string   | —       | `Model Y` or `Model 3`                                     |
| `events`       | csv      | all     | subset of `vin,production,papers,delivery,window,created`  |
| `includeTost`  | bool     | `false` | include rows where `source = 'tost'`                       |

Response:

```ts
{
  entries: Array<{
    id: string
    orderId: string
    orderName: string
    country: string | null
    vehicleType: string
    field: string
    eventType: 'vin' | 'production' | 'papers' | 'delivery' | 'window' | 'created'
    oldValue: string | null
    newValue: string | null
    changedAt: string  // ISO
  }>
  nextCursor: string | null
}
```

Implementation:

- Single Prisma query with `include: { order: true }`.
- Filter `Order.country` / `Order.vehicleType` via `where: { order: { ... } }`.
- Exclude `Order.archived = true`.
- `field` → `eventType` mapping done server-side.
- No caching — feed must be fresh.

## 4. `<UpdatesFeed>` component

**File:** `src/components/UpdatesFeed.tsx`. Inserted in `src/app/[locale]/page.tsx` between the hero and the order table.

Props:

```ts
{
  globalFilters: { countries: string[]; vehicleType: VehicleType | 'all' }
  onOrderClick: (orderId: string) => void   // hooks into the existing
                                            // OrderTable.scrollToOrderId prop
}
```

Behavior:

- Fetches `/api/orders/history` on mount and whenever `globalFilters` or local event-filter change. Debounced 200 ms.
- Polls every 60 s via `setInterval`.
- Wrapped in a `<CollapsibleOrderSection>`-style card. Default state: expanded on desktop, collapsed on mobile (`useIsMobile`).
- Header: title `updatesFeed.title` + count badge + collapse chevron.
- Filter row: event-type chip toggles (`VIN`, `Produktion`, `Papiere`, `Auslieferung`, `Lieferfenster`, `Neu`). Multi-select, all-on by default. Persisted in `localStorage` under `tesla-tracker-feed-events`.
- Body: entries grouped into day-buckets (`Heute` / `Gestern` / `Diese Woche` / `Älter`). Each entry: status icon + colored chip + order name (button) + relative time (reuses `formatRelativeTime`).
- Footer: "Mehr laden" button if `nextCursor !== null`; loads the next 50.
- Empty state: localized "Noch keine Updates" via existing `<EmptyState>`.
- Each entry is a `<button>`; full keyboard navigation; aria-label includes "<order name>: <event description>, <relative time>".

Event-type filter UI is local to the feed; country and vehicle filters come from the existing `GlobalFilterBar` so the rest of the page stays consistent.

Translations: add `updatesFeed.*` keys mirroring all existing locales (de/en/…; mirrored from whatever is present in `src/i18n`).

## 5. Bug fix: column-visibility persistence

**Root cause** (`OrderTable.tsx:475-492`): load-time logic adds every column not present in the saved set back into `visibleColumns`, undoing every hide. The original intent was to handle "new column added since last save."

**Fix:** save both the visible set and a schema fingerprint so we can distinguish "user hid this" from "this column did not exist when prefs were saved."

```ts
const COLUMNS_STORAGE_KEY = 'tesla-tracker-table-columns-v2'   // bumped from v1 to invalidate broken prefs
const COLUMNS_SCHEMA      = COLUMN_DEFS.map(c => c.key).sort().join(',')

// Stored shape:
// { visible: string[]; schema: string }
```

On load:

- If `stored.schema === COLUMNS_SCHEMA` → use `stored.visible` exactly. Hides persist.
- If schemas differ → compute set diff `currentKeys − previousKeysFromStoredSchema`; add only those *new* keys to `stored.visible`. Old hidden columns stay hidden. Re-save with the new schema.
- If no stored value or parse fails → fall back to `DEFAULT_VISIBLE_COLUMNS`.

Bumping the storage key to `-v2` cleanly retires the broken existing prefs.

## 6. Bug fix: column-width stability

**Root cause:** `<Table>` is rendered with default `table-auto`. Virtualized row remounts plus content variability cause widths to renegotiate per scroll tick — most visibly the "Updated" column.

**Fix:**

1. Extend `ColumnDef` with `width: number /* px */`. Calibrate per column (dates ~140, names ~180, status ~120, etc.) during implementation against real data.
2. Render a `<colgroup>` inside `<Table>` with one `<col style={{ width: <px> }} />` per **visible** column.
3. Add `table-fixed` class to the `<Table>` element.
4. Wrap text cell content in `<span className="block truncate" title={fullValue}>...</span>` so long values truncate visually and the full value appears as a native browser tooltip on hover.
5. Update the sticky-scrollbar `scrollWidth` measurement hook so the bottom scrollbar reflects the now-stable widths.

No Radix tooltip is added — the native `title` attribute is sufficient and matches what the issue explicitly requests ("bei einem Hover den gesamten Text").

---

## File-by-file impact summary

| File                                              | Change                                                               |
|---------------------------------------------------|----------------------------------------------------------------------|
| `prisma/schema.prisma`                            | Add `OrderHistory` model + `Order.history` relation                  |
| `src/lib/order-history.ts` (new)                  | `recordOrderChanges()` helper                                        |
| `src/app/api/orders/route.ts` (or equivalent)     | Hook into create path                                                |
| `src/app/api/orders/[id]/route.ts`                | Hook into admin edit path                                            |
| `src/app/api/orders/by-code/[code]/route.ts`      | Hook into user-edit path                                             |
| TOST sync code (path TBD)                         | Hook into bulk path with `source: 'tost'`                            |
| `src/app/api/orders/history/route.ts` (new)       | Feed API                                                             |
| `src/components/UpdatesFeed.tsx` (new)            | Feed UI                                                              |
| `src/app/[locale]/page.tsx`                       | Mount `<UpdatesFeed>`; wire `onOrderClick` → `scrollToOrderId`       |
| `src/components/OrderTable.tsx`                   | Storage-key bump + schema-aware load; `<colgroup>`; `table-fixed`; truncate cells |
| `src/i18n/<locale>.json` × N                       | Add `updatesFeed.*` translation keys                                 |

## Risks & mitigations

- **Bulk TOST sync flooding the feed.** Mitigated by `source` column + `includeTost=false` default.
- **Schema migration on prod SQLite.** Additive only; covered by existing Docker template-DB build flow.
- **Calibrated column widths may not fit all locales.** Mitigated by truncate-with-tooltip — values that don't fit are still readable on hover.
- **Polling cost.** Single indexed query, capped at 50 rows; negligible at current site scale.
