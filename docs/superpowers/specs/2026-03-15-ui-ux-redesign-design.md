# Tesla Order Tracker — UI/UX Redesign Spec

## Context

The Tesla Order Tracker is a community-driven Next.js app for TFF members to track Tesla Model Y and Model 3 orders worldwide. It has ~930 orders, solid analytics features, and active daily users. A recent UI overhaul added trust signals, delivery prediction, trend charts, a Speed tab, and SEO improvements.

A comprehensive Playwright visual audit at 390px, 768px, and 1440px in light and dark mode identified 16 issues spanning layout breakage, visual identity problems, and missing polish. User goals for this redesign:

- **Reassurance:** Users should immediately feel their order is on track.
- **Authority:** The site should feel like the definitive Tesla delivery tracking resource.
- **Community personality:** Warm, enthusiast-club feel — not a generic SaaS dashboard.
- **Ground-up information architecture rethink** with the community dashboard and order table as the primary focus.

## Audit Findings (16 Issues)

### Critical
1. Header breaks at 768px — title wraps to 4 lines, logo misaligns.
2. Stat card labels truncate at 768px — "Ausste...", "Liefer...", "Ø Best..."
3. Trust signal labels truncate on mobile — "Erfasste Bestellu..."
4. Tab content doesn't scroll into view on tab switch.
5. Mobile tabs — "Übersicht" tab scrolls off-screen left.

### Moderate
6. No empty state for stats dashboard with 0 matching orders.
7. Prediction card visible but empty when collapsed — wastes vertical space.
8. Filter bar takes too much vertical space on mobile (5 stacked dropdowns).
9. Watermarks at 15% opacity are barely visible for screenshot sharing.
10. Table column headers cut off on desktop ("A..." for AHK).

### Polish
11. Hero and regular stat cards lack visual distinction.
12. Order card progress bar too thin (h-2) — easy to miss.
13. Quarter group headers wrap to two lines on mobile.
14. Footer is bland — minimal visual weight, no personality.
15. Dark mode trust signals border too subtle.
16. No micro-interactions on filter dropdowns.

---

## Design

### 1. Information Architecture & Routing

**Current:** Single monolithic page (`/[locale]/page.tsx`, 623 lines) containing trust signals, prediction, filters, 6 stat tabs, and orders table.

**New routing (all under `src/app/[locale]/`):**

| Route | File | Purpose |
|-------|------|---------|
| `/` | `[locale]/page.tsx` | Home — community pulse hero + full dashboard + orders browser |
| `/track/[name]` | `[locale]/track/[name]/page.tsx` | Personal order tracking view (new) |
| `/new` | `[locale]/new/page.tsx` | New order form (extracted from modal to full page) |
| `/docs` | `[locale]/docs/page.tsx` | API documentation (existing) |
| `/impressum` | `[locale]/impressum/page.tsx` | Legal notice (existing) |
| `/admin/*` | `[locale]/admin/*` | Admin panel (existing, unchanged) |

All routes live under the `[locale]` dynamic segment. The existing next-intl middleware and `localePrefix: 'as-needed'` configuration handle locale detection. The `/track/[name]` segment cannot conflict with locale prefixes because `track` is not a valid locale value (`de`/`en`).

**Shared header** — compact, persistent across all pages:
- Logo + "TFF Order Stats" (short name always, no subtitle in header)
- Nav items: "Dashboard" (scrolls to `#dashboard` on `/`, navigates to `/#dashboard` from other pages) | "+ Neue Bestellung" (CTA, links to `/new`)
- Utilities: Search | Language | Theme toggle
- Below 1024px: icon-only nav items. Mobile: logo + hamburger with slide-out menu.

**Key decisions:**

**`/track/[name]` slug handling:**
- Lookup is a case-insensitive `WHERE LOWER(name) = LOWER(?)` query on the existing `name` field. The current composite index on `[name, orderDate]` covers this query.
- URL encoding: names with spaces and special characters produce URLs like `/track/Hans%20M%C3%BCller`. This is acceptable — these URLs are primarily shared via copy-paste (WhatsApp, forum), not typed manually. The browser displays them decoded.
- Multiple matches (same name, different orders): show a disambiguation page listing all matching orders with their order date and vehicle type.
- Name not found: show a friendly error with search bar and "Neue Bestellung" CTA.
- Future optimization: if order volume grows significantly, add a dedicated `slug` column with `COLLATE NOCASE` index. At ~930 orders, the full-scan from `LOWER()` is negligible (sub-ms on SQLite).

**`/new` page post-submission flow:**
- On successful order creation, the page shows an inline success state (not a modal): "Bestellung erstellt!" with the edit code / password confirmation (same content as current `EditCodeModal`).
- A "Zur Übersicht" button navigates to `/`. A "Meine Bestellung ansehen" button navigates to `/track/[name]`.
- The order form component (`OrderForm`) is refactored to accept a `mode: 'page' | 'modal'` prop. In page mode, it renders full-width without dialog wrapper and handles success inline. In modal mode (used for editing), behavior is unchanged.

**Other decisions:**
- The home page is the dashboard — community stats and the order table are the primary content, not a secondary feature.
- Current modals (edit, delete, reset code, password prompt) remain as modals.
- Filter state persists in `localStorage` across page navigations (existing behavior, unchanged).

### 2. Home Page (`/`)

The dashboard IS the home page. Top to bottom:

**Hero section** — compact, gets users to content fast:
- Heading: "Tesla Bestellungen und Statistiken"
- Subheading: "Die größte Community-Datenbank für Tesla Lieferzeiten. Model Y, Model 3 — weltweit."
- One prominent action: "Meine Bestellung finden" (opens search overlay). The dashboard content is immediately below — no button needed to scroll to it.

**Community pulse strip** — 4 animated metrics in a horizontal row:
- Total orders | Delivered (with percentage) | Avg delivery time | VINs this week
- Lightweight API endpoint (cached), not full order list
- Animated count-up on first visibility

**Stats toggle** — "Statistiken ausblenden/anzeigen" button (keep current behavior)

**When expanded:**
- Prediction widget — collapsed by default. Title row only when collapsed (no description text). Expands on click.
- Filter bar — horizontal on desktop, collapsed "Filter" button with active count badge on mobile
- **Sticky tab bar** — 6 tabs, sticks below header when scrolling. Active tab auto-scrolls into view. Tab switch smooth-scrolls content into view.
- Tab content area (see Section 6 for tab-by-tab details)

**Orders section** — below the dashboard:
- Section divider with "Bestellungen" label
- Orders card with header, refresh button, "Neue Bestellung" CTA
- Collapsible quarter groups with order table/cards

**Footer** — see Section 8.

### 3. Personal Tracking View (`/track/[name]`)

A focused, shareable page about one specific order.

**Layout:**

1. **Back navigation** — "← Zurück zur Übersicht" breadcrumb

2. **Order hero card** — full-width:
   - Large car image (compositor render, hero-sized — not thumbnail)
   - Name + order date + country flag
   - Config badges (larger than table view)

3. **Progress timeline** — the centerpiece:
   - Large horizontal 4-step timeline: Bestellt → VIN erhalten → Papiere → Geliefert
   - Each step shows its date if available
   - Current step highlighted with gentle pulse animation
   - Connecting lines animated/filled up to current step
   - Takes significant vertical space — this is the primary content

4. **Delivery prediction card** — personalized to this order's config:
   - "Basierend auf 47 ähnlichen Bestellungen (MY Premium AWD, Deutschland)"
   - Optimistic / Expected / Pessimistic columns
   - If delivered: "Schneller als X% der Bestellungen" comparison

5. **Support card** — post-value donation ask (see Section 9):
   - Warm, non-intrusive card after the prediction
   - "Diese Daten werden von der Community für die Community gepflegt."

6. **Similar orders** — 5-8 orders with matching config:
   - Same model, drive, country
   - Shows their timelines for comparison
   - Contextualizes the user's wait time

7. **Details grid** — all order fields laid out with breathing room

8. **Actions** — Edit button (password modal), share button (copies URL)

**Similar orders query strategy:**
- Query: `WHERE vehicleType = ? AND model = ? AND deliveryDate IS NOT NULL`, ordered by `orderDate DESC`, limited to 8.
- If fewer than 3 results: relax by dropping `model` filter, query by `vehicleType` and `drive` instead.
- If still fewer than 3: show whatever matches with a note "Wenige vergleichbare Bestellungen verfügbar."
- This query runs server-side in the page's data fetching, not client-side.

**SEO/sharing:**
- Dynamic OG meta tags: "[Name]'s Tesla Model 3 — Bestellt 14.03.2026"
- Clean URL: `tff-order-stats.de/track/ThePilzkopf`
- Shareable in WhatsApp, TFF forum, etc.
- These pages should be `noindex` (not added to sitemap) — they contain personal data and are meant for direct sharing, not search engine discovery.

**Error states:**
- Name not found: friendly message + search + new order CTA
- Multiple matches: disambiguation list with order dates and vehicle types

### 4. Visual Identity Overhaul

**Color system — semantic, not monochrome:**

| Role | Color | Usage |
|------|-------|-------|
| Brand | Tesla Red `oklch(0.55 0.22 25)` | Logo, header accent line, primary CTA buttons only |
| Delivered/Success | Green `oklch(0.55 0.16 145)` | Delivered badges, progress complete, positive trends |
| Data/Insights | Blue `oklch(0.55 0.16 245)` | Charts, stat card icons for data metrics, prediction |
| Pending/Waiting | Amber `oklch(0.65 0.15 75)` | Pending orders, in-progress states, scheduled delivery |
| Neutral | Slate tones | Borders, muted text, backgrounds |

**Key shift:** Tesla Red becomes the brand accent only (logo, header stripe, "Neue Bestellung" CTA). Everything else uses semantic colors. Delivered = green. Data = blue. Waiting = amber.

**Typography:**
- Hero headings: `text-3xl font-bold tracking-tight`
- Section headings: `text-xl font-semibold`
- Stat card values: keep current large sizes
- Stat card labels: better contrast against values
- Numbers everywhere: `tabular-nums font-mono` for data-platform feel

**Card system:**
- Fewer borders, more background differentiation
- Hero stat cards: larger, with colored left bar using semantic color (green for Geliefert, blue for Lieferzeit)
- Regular stat cards: simpler — number + label + semantic icon color, no accent bars

**Iconography:**
- Icons shift from all-red to semantic colors matching their meaning
- Delivered checkmark = green, Timer = blue, Package = amber, Car = neutral

**Dark mode:**
- Subtle color tints on card backgrounds matching semantic zones
- Improved trust signals border visibility (finding #15)

**Community personality:**
- Milestone celebrations: quarter at 50%+ delivered gets shimmer on percentage badge
- Animated delivery counter in community pulse strip
- Warm micro-copy: "Deine voraussichtliche Lieferung" not "Prognose"

### 5. Responsive Layout Fixes

**Header (fixes finding #1):**
- Compact at all breakpoints: Logo + short name "TFF Order Stats"
- Nav items: icon-only below 1024px, icon+text above
- Mobile: logo + hamburger
- Full site name/description moves to hero section

**Stat cards (fixes finding #2):**
- Responsive grid: `<640px` 2-col, `640-1024px` 2-col (NOT 4), `>1024px` 4-col
- Hero cards: 2-card row with larger text at all widths
- Secondary cards: 2x2 below hero cards on mobile/tablet

**Trust signals (fixes finding #3):**
- Shorter labels on mobile: "Bestellungen" not "Erfasste Bestellungen"

**Tabs (fixes findings #4, #5):**
- Sticky tab bar below header when scrolling past
- Active tab auto-scrolls into view
- Tab switch smooth-scrolls content panel into view
- First tab always visible

**Filters (fixes finding #8):**
- Mobile: collapsed by default behind "Filter" button with active count badge
- Desktop: horizontal row in muted container

**Quarter headers (fixes finding #13):**
- Abbreviated single-line: "Q4 '25 · 331 · ✓151 · ◷180 · 46%"

**Order cards:**
- Progress bar: h-2 → h-2.5
- Subtle status color tint on card background (faint green/amber)

**Touch targets:**
- All buttons/icons minimum 44x44px
- Edit pencil: `h-8 w-8` → `h-10 w-10` with padding

**Tested breakpoints:** 390px, 430px, 768px, 1024px, 1440px

### 6. Dashboard Tab Improvements

**Overview tab:**
- 2 hero cards (Gesamt with blue accent, Geliefert with green accent) — visually prominent
- 6 secondary stat cards in 3x2 grid (desktop), 2-col (mobile) — simpler styling
- Empty state: illustration + "Keine Daten für diese Filter" + reset CTA

**Config + Equipment tabs:**
- Mini pie charts with hover states showing count
- Blue-tinted icon backgrounds instead of red

**Geo tab:**
- Country/location bar charts (unchanged)
- Country delivery ranking table with rank medals (gold/silver/bronze) for top 3
- Subtle row coloring: fastest=green → slowest=amber gradient on left border

**Timeline tab:**
- Delivery trend chart first
- Two timeline charts side by side
- VIN activity chart
- VIN weekday chart
- Wait time distribution

**Speed tab:**
- Config delivery insights with dimension dropdown
- "Fastest config" callout card at top: "Schnellste Konfiguration: Model Y Standard RWD — Median 28 Tage"

**Cross-tab improvements:**
- Tab switch: 200ms fade-in transition
- Filter change: stat card values briefly pulse
- Number changes: count-up animation on recalculate
- Chart card watermarks: bump to 20% opacity
- Hero stat card watermarks: keep at 15%

### 7. Table & Order List Improvements

**Table header:**
- Sticky below page header when scrolling through rows
- Subtle `bg-muted/40` background

**Row interactions:**
- Hover: subtle left border accent in status color (green=delivered, amber=pending)
- Highlight from search: smoother glow pulse

**Column headers (fixes finding #10):**
- Ensure minimum column widths prevent truncation of short labels
- "AHK" column: explicitly set min-width

### 8. Footer Redesign

**Structure — two rows with visual weight:**

**Top row:** Nav links (GitHub, API Docs, Impressum) with hover underline animations, separated by subtle dot separators.

**Bottom row:**
- "Betrieben von [Name] · [Hosting & Entwicklung unterstützen →]" (donation link, see Section 9)
- Below: "932 Bestellungen · 362 ausgeliefert · Daten seit Jul 2025"
- Below: Yearly transparency bar (see Section 9)

**Styling:**
- Background: subtle muted tint, distinct from page
- Gradient top border: transparent → primary/20 → transparent
- Generous padding: `py-10 sm:py-16`

### 9. Donation Strategy

Three subtle, value-aligned approaches — no begging:

**A. Footer attribution with support link:**
"Betrieben von [Name] · [Hosting & Entwicklung unterstützen →]"
Factual statement, not an ask. Placed in footer bottom row.

**B. Post-value ask on personal tracking page:**
After the progress timeline and prediction on `/track/[name]`, a small card:
"Diese Daten werden von der Community für die Community gepflegt. Wenn dir die Seite hilft, kannst du die Serverkosten unterstützen."
[☕ Unterstützen]
Appears at the moment of highest gratitude — after the user received value (their order status, prediction, comparisons).

**C. Yearly transparency bar in footer:**
A thin progress bar: "Serverkosten 2026: €47 / €120"
No words needed. Concrete, achievable goal. Updates via admin settings (extend current Settings model with `yearlyGoal` and `yearlyRaised` fields).

**Key principle:** Ask after delivering value, never before. The home page has no donation ask above the fold. The tracking page ask comes after the user has seen their data.

### 10. Loading & Empty States

**Loading:**
- Skeleton loaders with shimmer animation (CSS already exists, apply consistently)
- Tab content switching: 150ms fade transition
- Order list refresh: fade overlay, not hard re-render

**Empty states:**
- Dashboard 0 matching orders: illustration + friendly message + reset filters CTA
- Personal tracking unknown name: "Keine Bestellung gefunden" + search + new order CTA
- Chart no data: subtle empty-chart illustration + message (not just text)
- Stat cards 0 value: show "—" with muted styling, not "0"

**Celebration moments:**
- Delivered order on `/track/[name]`: confetti burst on page load (existing component)
- Quarter delivery rate milestones (50%, 75%): subtle glow on percentage badge

---

## What Does NOT Change

- Backend/API — all existing endpoints unchanged
- Admin panel — untouched
- Auth flow — untouched
- Order form fields — same fields, just on a dedicated page instead of modal
- Existing chart components — same Recharts implementations, just better containers

## What Changes Minimally

- **Database schema** — one minor migration: add `yearlyGoal` (Int, nullable) and `yearlyRaised` (Int, nullable) fields to the `Settings` model for the donation transparency bar. No other schema changes.
- **New API endpoint** — `GET /api/pulse` returning cached community metrics (total orders, delivered count, avg delivery days, VINs this week). The VIN count requires parsing `vinReceivedDate` strings (format: `DD.MM.YYYY`, same as all date fields in the app) for the current ISO week. Response is cached for 5 minutes via `Cache-Control`.

## Technical Approach

- **Framework:** Next.js 16 App Router (existing)
- **New pages:** `[locale]/track/[name]/page.tsx`, `[locale]/new/page.tsx`, restructured `[locale]/page.tsx`
- **Shared layout:** Extract header into `src/components/Header.tsx`, footer into `src/components/Footer.tsx`
- **Color tokens:** New CSS custom properties in `globals.css` for semantic colors
- **Existing components:** Modify in-place (StatCard, OrderCard, OrderTable, CollapsibleOrderSection, OrderGroupHeader, OrderProgressBar, StatisticsDashboard)
- **New components:** `PersonalTrackingView`, `ProgressTimeline` (large), `SimilarOrders`, `SupportCard`, `TransparencyBar`, `FilterCollapse` (mobile)
- **i18n:** New translation keys for personal tracking page, updated micro-copy

**Sticky tab bar implementation:**
- The tab bar gets `position: sticky` with a `top` value set via CSS custom property `--header-height`.
- Header heights per breakpoint: `--header-height: 56px` (mobile), `64px` (desktop). Set in `globals.css` with media queries.
- Tab bar z-index: `z-40` (below header's `z-50`).

**Animation approach:**
- CSS `@keyframes` for: shimmer (loading skeletons), count-up-pulse (number changes), tab fade-in transitions. These are lightweight and respect `prefers-reduced-motion`.
- Framer Motion for: page-level entrance animations, progress timeline step animations, confetti celebration. These already exist in the codebase.
- All animations wrapped in `@media (prefers-reduced-motion: no-preference)` or Framer Motion's `useReducedMotion` hook.

**Accessibility:**
- Progress timeline: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. Step labels are `aria-label` annotated.
- Sticky tab bar: keyboard navigable with arrow keys (Radix Tabs already handles this).
- Animated count-up numbers: `aria-live="polite"` region so screen readers announce the final value.
- Confetti/shimmer/pulse: all gated behind `prefers-reduced-motion` — disabled when the user prefers reduced motion.

## Execution Order

1. Visual identity (color system, typography, globals.css) — foundation
2. Header/footer extraction and redesign — shared layout
3. Home page restructure (hero, pulse strip, dashboard remains) — routing
4. Responsive fixes (all 16 findings) — cross-cutting
5. Dashboard tab improvements — polish
6. Personal tracking page — new feature
7. Donation integration — 3 touchpoints
8. Loading/empty states and celebrations — final polish
