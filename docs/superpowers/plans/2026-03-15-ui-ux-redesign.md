# UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ground-up UI/UX redesign of the Tesla Order Tracker — new routing with personal tracking page, semantic color system, responsive fixes for all 16 audit findings, community personality, and donation integration.

**Architecture:** Next.js 16 App Router with new routes under `[locale]/`. Extract shared header/footer from the monolithic page.tsx. Add `/track/[name]` personal view and `/new` order form page. Overhaul CSS design tokens for semantic colors. All existing APIs unchanged; one new `/api/pulse` endpoint.

**Tech Stack:** Next.js 16, TypeScript, Prisma 7, SQLite, Tailwind CSS 4, shadcn/ui, Framer Motion, Recharts, next-intl

**Spec:** `docs/superpowers/specs/2026-03-15-ui-ux-redesign-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/Header.tsx` | Shared compact header with nav, search, hamburger menu |
| `src/components/Footer.tsx` | Shared footer with donation attribution and transparency bar |
| `src/components/HeroSection.tsx` | Home page hero with heading, subheading, search CTA |
| `src/components/CommunityPulse.tsx` | 4-metric animated strip (replaces TrustSignals.tsx) |
| `src/components/FilterCollapse.tsx` | Mobile-collapsible filter bar wrapper |
| `src/components/SupportCard.tsx` | Post-value donation ask card |
| `src/components/TransparencyBar.tsx` | Yearly server cost progress bar |
| `src/components/ProgressTimeline.tsx` | Large 4-step visual timeline for tracking page |
| `src/components/SimilarOrders.tsx` | Comparison table of similar orders |
| `src/components/EmptyState.tsx` | Reusable empty state with illustration and CTA |
| `src/app/[locale]/track/[name]/page.tsx` | Personal order tracking view |
| `src/app/[locale]/new/page.tsx` | Standalone order form page |
| `src/app/api/pulse/route.ts` | Cached community metrics endpoint |

### Modified Files
| File | Changes |
|------|---------|
| `src/app/globals.css` | Semantic color tokens, `--header-height`, reduced-motion, sticky tab styles |
| `src/app/[locale]/page.tsx` | Restructure: extract header/footer, add hero, rewire dashboard |
| `src/app/[locale]/layout.tsx` | Use shared Header component |
| `src/components/statistics/StatCard.tsx` | Semantic colors on icon/accent bar per card type |
| `src/components/statistics/StatisticsDashboard.tsx` | Sticky tabs, scroll-to-content, fade transitions, filter collapse |
| `src/components/OrderCard.tsx` | Status color tint, thicker progress bar, larger touch targets |
| `src/components/OrderTable.tsx` | Sticky header, row hover accent, min column widths, search highlight |
| `src/components/OrderGroupHeader.tsx` | Abbreviated mobile layout, milestone glow |
| `src/components/OrderProgressBar.tsx` | Slightly thicker bar |
| `src/components/CollapsibleOrderSection.tsx` | Minor spacing adjustments |
| `src/components/OrderForm.tsx` | Add `mode: 'page' | 'modal'` prop |
| `src/components/TrustSignals.tsx` | Rename/replace with CommunityPulse |
| `src/components/statistics/DeliveryPrediction.tsx` | Collapse without description text |
| `src/components/statistics/ConfigDistributionCharts.tsx` | Blue-tinted icon backgrounds |
| `src/components/admin/SettingsTab.tsx` | Remove DonationBanner reference |
| `messages/de.json` | New namespaces: tracking, hero, footer, support; updated micro-copy |
| `messages/en.json` | Same new namespaces in English |
| `prisma/schema.prisma` | Add yearlyGoal, yearlyRaised to Settings |

### Deleted Files
| File | Reason |
|------|--------|
| `src/components/TrustSignals.tsx` | Replaced by `CommunityPulse.tsx` |
| `src/components/DonationBanner.tsx` | Replaced by footer attribution + SupportCard |

---

## Chunk 1: Foundation — Visual Identity & CSS

### Task 1: Semantic Color Tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add semantic color CSS custom properties**

Add after the existing `:root` variables:

```css
:root {
  /* Semantic colors */
  --color-success: oklch(0.55 0.16 145);
  --color-success-light: oklch(0.92 0.05 145);
  --color-data: oklch(0.55 0.16 245);
  --color-data-light: oklch(0.92 0.05 245);
  --color-pending: oklch(0.65 0.15 75);
  --color-pending-light: oklch(0.92 0.06 75);
}

.dark {
  --color-success: oklch(0.65 0.16 145);
  --color-success-light: oklch(0.25 0.05 145);
  --color-data: oklch(0.65 0.16 245);
  --color-data-light: oklch(0.25 0.05 245);
  --color-pending: oklch(0.72 0.15 75);
  --color-pending-light: oklch(0.25 0.06 75);
}
```

- [ ] **Step 2: Add `--header-height` custom property**

```css
:root {
  --header-height: 56px;
}

@media (min-width: 640px) {
  :root {
    --header-height: 64px;
  }
}
```

- [ ] **Step 3: Add sticky tab bar styles**

```css
.sticky-tabs {
  position: sticky;
  top: var(--header-height);
  z-index: 40;
  background: var(--background);
  border-bottom: 1px solid var(--border);
}
```

- [ ] **Step 4: Add reduced-motion media query wrapping animations**

Wrap existing `@keyframes shimmer`, `count-up-pulse`, `pulse-glow` in:

```css
@media (prefers-reduced-motion: no-preference) {
  /* existing keyframes here */
}
```

- [ ] **Step 5: Add Tailwind theme extensions for semantic colors**

In the `@theme inline` block, add:

```css
--color-success: var(--color-success);
--color-success-light: var(--color-success-light);
--color-data: var(--color-data);
--color-data-light: var(--color-data-light);
--color-pending: var(--color-pending);
--color-pending-light: var(--color-pending-light);
```

- [ ] **Step 6: Run build to verify CSS compiles**

```bash
npm run build
```

Expected: Compiled successfully

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add semantic color tokens and header-height CSS properties"
```

### Task 1b: Typography & Card System Updates

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add typography utility classes**

In `globals.css`, add:
```css
/* Data numbers: monospace tabular for alignment */
.data-value {
  font-variant-numeric: tabular-nums;
  font-family: var(--font-geist-mono), monospace;
}
```

- [ ] **Step 2: Update stat card label contrast**

In `globals.css`, the existing stat card label uses `text-muted-foreground`. No CSS change needed — the contrast will be improved by making the label `text-xs` and the value `font-bold text-2xl`, which the StatCard component already does. Verify the visual contrast is acceptable.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: typography utilities for tabular numbers"
```

### Task 2: Update StatCard with Semantic Colors

**Files:**
- Modify: `src/components/statistics/StatCard.tsx`

- [ ] **Step 1: Add `semanticColor` prop to StatCard**

Add a new optional prop `semanticColor?: 'success' | 'data' | 'pending' | 'brand'` that controls the left accent bar and icon background color instead of always using `primary`.

- [ ] **Step 2: Map semantic colors to Tailwind classes**

```typescript
const colorMap = {
  brand: { bg: 'bg-primary/10', text: 'text-primary', bar: 'from-primary/60 to-primary/20' },
  success: { bg: 'bg-[var(--color-success)]/10', text: 'text-[var(--color-success)]', bar: 'from-[var(--color-success)]/60 to-[var(--color-success)]/20' },
  data: { bg: 'bg-[var(--color-data)]/10', text: 'text-[var(--color-data)]', bar: 'from-[var(--color-data)]/60 to-[var(--color-data)]/20' },
  pending: { bg: 'bg-[var(--color-pending)]/10', text: 'text-[var(--color-pending)]', bar: 'from-[var(--color-pending)]/60 to-[var(--color-pending)]/20' },
}
```

Replace hardcoded `bg-primary/10` and `text-primary` with the mapped values. Default to `'brand'` if not specified.

- [ ] **Step 3: Update StatisticsDashboard to pass semantic colors**

In `StatisticsDashboard.tsx`, update the StatCard usages:
- `Total` → `semanticColor="data"`
- `Delivered` → `semanticColor="success"`
- `Pending` → `semanticColor="pending"`
- `Avg Delivery Time` → `semanticColor="data"`
- `Avg Order→VIN` → `semanticColor="data"`
- `Delivery Rate` → `semanticColor="success"`
- Others → `semanticColor="data"`

- [ ] **Step 4: Run build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/statistics/StatCard.tsx src/components/statistics/StatisticsDashboard.tsx
git commit -m "feat: semantic color system for stat cards"
```

---

## Chunk 2: Shared Layout — Header & Footer Extraction

### Task 3: Create Shared Header Component

**Files:**
- Create: `src/components/Header.tsx`
- Modify: `src/app/[locale]/page.tsx`

- [ ] **Step 1: Create `Header.tsx`**

Extract the header from `page.tsx` into a standalone client component. The header should:
- Accept props: `isAdmin: boolean`, `settings: Settings | null`, `onSearchOpen: () => void`
- Show compact layout: Logo + "TFF Order Stats" (always short name)
- Desktop (>=1024px): icon+text nav items. Tablet (640-1024): icon-only. Mobile (<640): logo + hamburger.
- Nav: "Dashboard" link (to `/`), "+ Neue Bestellung" CTA (to `/new`), Search, Language, Theme, Admin
- Mobile hamburger: slide-out Sheet (shadcn/ui) with all nav items
- Use the existing `shadow-sm` sticky header style with `h-[var(--header-height)]`

- [ ] **Step 2: Create `Footer.tsx`**

Extract the footer from `page.tsx`. The footer should:
- Accept props: `settings: Settings | null`, `orderCount?: number`, `deliveredCount?: number`
- Top row: GitHub, API Docs, Impressum links with dot separators and hover underlines
- Bottom row: "Betrieben von Sven · Hosting & Entwicklung unterstützen →" (donation link from settings)
- Stats line: "{orderCount} Bestellungen · {deliveredCount} ausgeliefert"
- TransparencyBar (if settings have yearlyGoal)
- Generous padding `py-10 sm:py-16`, muted background tint

- [ ] **Step 3: Add shared Header to `layout.tsx`**

The Header should be in `src/app/[locale]/layout.tsx` so it renders on ALL routes (home, tracking, new order, docs, impressum). Move it out of `page.tsx` into the layout's `{children}` wrapper. The header needs to be a client component (it uses `useState` for search, admin status). Pass admin status via a context or fetch it in the header itself.

- [ ] **Step 4: Replace inline footer in `page.tsx` with Footer component**

Import and use `<Footer>` in page.tsx. Remove the inline footer JSX. Keep the Footer in page.tsx (not layout) since other pages like `/track/[name]` and `/new` may want different footer treatment.

- [ ] **Step 5: Run build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.tsx src/components/Footer.tsx src/app/[locale]/page.tsx src/app/[locale]/layout.tsx
git commit -m "refactor: extract header and footer into shared components"
```

### Task 4: Create TransparencyBar Component

**Files:**
- Create: `src/components/TransparencyBar.tsx`

- [ ] **Step 1: Create the component**

A thin progress bar showing yearly server costs: "Serverkosten 2026: €{raised} / €{goal}"
- Props: `goal: number`, `raised: number`, `year: number`
- Thin bar (h-2) with green fill
- Below the bar: label text in `text-xs text-muted-foreground`

- [ ] **Step 2: Wire into Footer**

Conditionally render `<TransparencyBar>` in Footer when `settings?.yearlyGoal` exists.

- [ ] **Step 3: Commit**

```bash
git add src/components/TransparencyBar.tsx src/components/Footer.tsx
git commit -m "feat: add yearly transparency bar for donation progress"
```

### Task 5: Add Hero Section and Community Pulse

**Files:**
- Create: `src/components/HeroSection.tsx`
- Create: `src/components/CommunityPulse.tsx`
- Create: `src/app/api/pulse/route.ts`
- Delete: `src/components/TrustSignals.tsx`

- [ ] **Step 1: Create `/api/pulse` endpoint**

```typescript
// GET /api/pulse — cached community metrics
// Returns: { totalOrders, deliveredOrders, deliveredPercent, avgDeliveryDays, vinsThisWeek }
// Cache-Control: public, max-age=300
```

Query all non-archived orders. Calculate:
- `totalOrders`: count
- `deliveredOrders`: count where deliveryDate is not null
- `avgDeliveryDays`: average of orderToDelivery for delivered orders
- `vinsThisWeek`: count where vinReceivedDate parses to current ISO week (use `parseGermanDate` from `statistics.ts`)

- [ ] **Step 2: Create `CommunityPulse.tsx`**

Replaces `TrustSignals.tsx`. Fetches from `/api/pulse` on mount (or accepts data as props).
- 4 metrics in horizontal row: Total | Delivered (%) | Avg Delivery | VINs this week
- Each metric: icon (semantic color) + animated number + label
- Responsive: 2x2 on mobile, 4-col on desktop
- Shorter labels on mobile: "Bestellungen" not "Erfasste Bestellungen"
- `aria-live="polite"` on the numbers container

- [ ] **Step 3: Create `HeroSection.tsx`**

- Heading: `t('hero.title')` — "Tesla Bestellungen und Statistiken"
- Subheading: `t('hero.subtitle')` — worldwide community database description
- One CTA button: "Meine Bestellung finden" → opens search overlay
- Props: `onSearchOpen: () => void`

- [ ] **Step 4: Update `page.tsx` to use new components**

Replace `<TrustSignals>` import and usage with `<CommunityPulse>`. Add `<HeroSection>` above the pulse strip. Do NOT delete `TrustSignals.tsx` yet — that happens in Task 25 after all replacements are verified.

- [ ] **Step 5: Add translation keys**

In `messages/de.json` and `messages/en.json`, add `hero` namespace:
```json
"hero": {
  "title": "Tesla Bestellungen und Statistiken",
  "subtitle": "Die größte Community-Datenbank für Tesla Lieferzeiten. Model Y, Model 3 — weltweit.",
  "findMyOrder": "Meine Bestellung finden"
}
```

- [ ] **Step 6: Run build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/components/HeroSection.tsx src/components/CommunityPulse.tsx src/app/api/pulse/route.ts src/app/[locale]/page.tsx messages/de.json messages/en.json
git commit -m "feat: hero section, community pulse, /api/pulse endpoint"
```

---

## Chunk 3: Responsive Fixes (Audit Findings 1-16)

### Task 6: Fix Header at 768px (Finding #1)

Already addressed in Task 3 — the new Header component uses compact layout at all widths. Verify visually.

### Task 7: Fix Stat Card Grid Responsive (Finding #2)

**Files:**
- Modify: `src/components/statistics/StatisticsDashboard.tsx`

- [ ] **Step 1: Change stat card grid breakpoints**

Replace `grid grid-cols-2 md:grid-cols-4` with `grid grid-cols-2 lg:grid-cols-4` for both stat card rows. This keeps 2 columns at 768px (md) and only goes to 4 at 1024px (lg).

- [ ] **Step 2: Commit**

```bash
git add src/components/statistics/StatisticsDashboard.tsx
git commit -m "fix: stat cards use 2-col at tablet, 4-col at desktop (finding #2)"
```

### Task 8: Fix Tab Scroll-Into-View (Finding #4, #5)

**Files:**
- Modify: `src/components/statistics/StatisticsDashboard.tsx`

- [ ] **Step 1: Add scroll-to-content on tab change**

Wrap the `<Tabs>` component with a ref. On `onValueChange`, smooth-scroll the tab panel into view:

```typescript
const tabsRef = useRef<HTMLDivElement>(null)

const handleTabChange = (value: string) => {
  // ... existing logic ...
  // Scroll tab content into view
  setTimeout(() => {
    tabsRef.current?.querySelector('[role="tabpanel"]')?.scrollIntoView({
      behavior: 'smooth', block: 'nearest'
    })
  }, 50)
}
```

- [ ] **Step 2: Add sticky tab bar class**

Apply `sticky-tabs` CSS class to `<TabsList>`. Ensure first tab is always visible by setting `scrollLeft = 0` on mount.

- [ ] **Step 3: Commit**

```bash
git add src/components/statistics/StatisticsDashboard.tsx
git commit -m "fix: tab switch scrolls content into view, sticky tabs (findings #4, #5)"
```

### Task 9: Mobile Filter Collapse (Finding #8)

**Files:**
- Create: `src/components/FilterCollapse.tsx`
- Modify: `src/components/statistics/StatisticsDashboard.tsx`

- [ ] **Step 0: Install shadcn/ui Collapsible component**

```bash
npx shadcn@latest add collapsible
```

This adds `src/components/ui/collapsible.tsx` which is required for the filter collapse.

- [ ] **Step 1: Create `FilterCollapse.tsx`**

A wrapper that on mobile (<640px) collapses its children behind a "Filter" button with an active count badge. On desktop, renders children normally.

```typescript
interface FilterCollapseProps {
  children: React.ReactNode
  activeCount: number
}
```

Uses shadcn/ui `Collapsible` component. Button shows "Filter" + badge with `activeCount` when > 0.

- [ ] **Step 2: Wrap filter bar in StatisticsDashboard with FilterCollapse**

Pass `activeCount` based on the number of non-default filters (model, color, drive, vehicle, period).

- [ ] **Step 3: Commit**

```bash
git add src/components/FilterCollapse.tsx src/components/statistics/StatisticsDashboard.tsx
git commit -m "fix: collapsible filter bar on mobile (finding #8)"
```

### Task 10: Remaining Responsive Fixes (Findings #9-16)

**Files:**
- Modify: `src/components/OrderGroupHeader.tsx` (finding #13)
- Modify: `src/components/OrderCard.tsx` (finding #12)
- Modify: `src/components/OrderProgressBar.tsx` (finding #12)
- Modify: `src/components/statistics/StatisticsDashboard.tsx` (findings #9, #11, #16)
- Modify: `src/components/OrderTable.tsx` (finding #10)

- [ ] **Step 1: Quarter headers — abbreviated mobile (finding #13)**

In `OrderGroupHeader.tsx`, abbreviate on mobile:
- Use `sm:hidden` / `hidden sm:flex` to show compact format on mobile: `Q4 '25 · 331 · ✓151 · ◷180 · 46%`
- Full format on desktop (existing layout)

- [ ] **Step 2: Order card progress bar thickness (finding #12)**

In `OrderProgressBar.tsx` barOnly mode, change the outer container height from `h-2` to `h-2.5`.

- [ ] **Step 3: Order card status color tint (finding #12)**

In `OrderCard.tsx`, add a faint background tint based on delivery status:
- Delivered: `bg-[var(--color-success-light)]/30`
- Pending: default (no tint)

- [ ] **Step 4: Watermark opacity (finding #9)**

In `StatisticsDashboard.tsx`, change chart card watermarks from `opacity-[0.15]` to `opacity-[0.20]`. Keep hero stat card watermarks at `opacity-[0.15]`.

- [ ] **Step 5: Table min column widths (finding #10)**

In `OrderTable.tsx`, add `min-w-[48px]` to the AHK column header and `min-w-[56px]` to Felgen column.

- [ ] **Step 6: Touch targets (finding)**

In `OrderCard.tsx`, change edit button from `h-8 w-8` to `h-10 w-10`.

- [ ] **Step 7: Run build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "fix: responsive fixes — quarter headers, progress bar, touch targets, watermarks, table columns (findings #9-13)"
```

### Task 10b: Table Sticky Header, Row Hover Accent, Search Highlight (Spec Section 7)

**Files:**
- Modify: `src/components/OrderTable.tsx`

- [ ] **Step 1: Add sticky table header**

Make the `<thead>` sticky with `position: sticky; top: var(--header-height); z-index: 30; background: var(--background);`. Add a subtle bottom border to visually separate from scrolling rows.

- [ ] **Step 2: Add row hover with status color left border**

On row hover, add a `border-left: 3px solid` using semantic colors: green for delivered orders, amber for pending. Use a CSS class toggled by the order's delivery status.

- [ ] **Step 3: Smoother search highlight glow**

Replace the current highlight ring with a smoother CSS animation: `@keyframes highlight-glow` that fades from a colored background to transparent over 2 seconds.

- [ ] **Step 4: Commit**

```bash
git add src/components/OrderTable.tsx
git commit -m "feat: sticky table header, status-colored row hover, smoother search highlight"
```

### Task 10c: Quarter Header Milestone Glow (Spec Section 10)

**Files:**
- Modify: `src/components/OrderGroupHeader.tsx`

- [ ] **Step 1: Add milestone glow on percentage badge**

When delivery rate >= 50%, add a subtle shimmer/glow CSS class to the percentage badge. When >= 75%, make it more prominent. Use existing `animate-pulse-glow` keyframe.

- [ ] **Step 2: Commit**

```bash
git add src/components/OrderGroupHeader.tsx
git commit -m "feat: milestone glow on quarter delivery rate badges"
```

---

## Chunk 4: Dashboard Tab Improvements

### Task 11: Stat Card Visual Hierarchy (Finding #11)

**Files:**
- Modify: `src/components/statistics/StatisticsDashboard.tsx`

- [ ] **Step 1: Separate hero and secondary stat card grids**

Hero cards (Gesamt, Geliefert) get their own `grid grid-cols-2 gap-4` row. Secondary cards (Pending, Avg Delivery, etc.) go in a separate `grid grid-cols-2 lg:grid-cols-3` row with simpler styling.

- [ ] **Step 2: Remove accent bars from secondary stat cards**

Pass a new prop `minimal` to non-hero StatCards to suppress the left accent bar.

- [ ] **Step 3: Commit**

```bash
git add src/components/statistics/StatCard.tsx src/components/statistics/StatisticsDashboard.tsx
git commit -m "feat: visual hierarchy — hero vs secondary stat cards (finding #11)"
```

### Task 12: Tab Transitions and Micro-Interactions (Finding #16)

**Files:**
- Modify: `src/components/statistics/StatisticsDashboard.tsx`

- [ ] **Step 1: Add fade-in on tab content**

Wrap each `<TabsContent>` inner content with Framer Motion:

```tsx
<motion.div
  key={tabValue}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.2 }}
>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/statistics/StatisticsDashboard.tsx
git commit -m "feat: 150ms fade-in on tab switch (finding #16)"
```

### Task 13: Empty States

**Files:**
- Create: `src/components/EmptyState.tsx`
- Modify: `src/components/statistics/StatisticsDashboard.tsx`

- [ ] **Step 1: Create reusable `EmptyState.tsx`**

```typescript
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}
```

Centered layout with muted icon, heading, description, optional button.

- [ ] **Step 2: Add empty state to Overview tab**

When `stats.totalOrders === 0`, show `<EmptyState>` instead of stat cards, with "Keine Daten für diese Filter" + reset button.

- [ ] **Step 3: Commit**

```bash
git add src/components/EmptyState.tsx src/components/statistics/StatisticsDashboard.tsx
git commit -m "feat: empty state for dashboard with 0 matching orders (finding #6)"
```

### Task 14: Prediction Widget Collapse Fix (Finding #7)

**Files:**
- Modify: `src/components/statistics/DeliveryPrediction.tsx`

- [ ] **Step 1: Remove description from collapsed state**

When collapsed (`!isExpanded`), show only the title row with the chevron. Remove the `<p>` description that currently shows below the title when collapsed.

- [ ] **Step 2: Commit**

```bash
git add src/components/statistics/DeliveryPrediction.tsx
git commit -m "fix: prediction widget shows only title when collapsed (finding #7)"
```

### Task 15: Geo Tab — Country Delivery Ranking Polish

**Files:**
- Modify: `src/components/statistics/StatisticsDashboard.tsx`

- [ ] **Step 1: Add rank medals for top 3 countries**

In the country delivery ranking table, replace the `#` column values for ranks 1-3 with gold (🥇), silver (🥈), bronze (🥉) emoji or colored circle indicators.

- [ ] **Step 2: Add left-border status color on rows**

Fastest rows get a green-tinted left border, slowest get amber. Calculate relative position and interpolate.

- [ ] **Step 3: Commit**

```bash
git add src/components/statistics/StatisticsDashboard.tsx
git commit -m "feat: rank medals and color-coded borders on country delivery table"
```

### Task 16: Speed Tab — Fastest Config Callout

**Files:**
- Modify: `src/components/statistics/ConfigDeliveryInsights.tsx`

- [ ] **Step 1: Add fastest config callout card**

Above the chart, if data exists, show a highlighted card:
"Schnellste Konfiguration: {name} — Median {days} Tage"
Use the first entry from the sorted values (already sorted fastest-first).

- [ ] **Step 2: Add translation key**

```json
"speed": {
  ...existing keys...,
  "fastestConfig": "Schnellste Konfiguration: {name} — Median {days} Tage"
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/statistics/ConfigDeliveryInsights.tsx messages/de.json messages/en.json
git commit -m "feat: fastest config callout card in Speed tab"
```

### Task 16b: Config + Equipment Tab Polish (Spec Section 6)

**Files:**
- Modify: `src/components/statistics/ConfigDistributionCharts.tsx`
- Modify: `src/components/statistics/StatisticsDashboard.tsx`

- [ ] **Step 1: Blue-tinted icon backgrounds on Config/Equipment chart cards**

In `StatisticsDashboard.tsx`, the Config and Equipment tab chart card headers currently use `bg-primary/10` for icon backgrounds. Change to `bg-[var(--color-data)]/10` and `text-[var(--color-data)]` for the icon, since these are data-insight cards.

- [ ] **Step 2: Add hover state to MiniPieChart showing count**

In `ConfigDistributionCharts.tsx`, add a hover tooltip or cursor effect that shows the absolute count on hover over pie segments.

- [ ] **Step 3: Commit**

```bash
git add src/components/statistics/ConfigDistributionCharts.tsx src/components/statistics/StatisticsDashboard.tsx
git commit -m "feat: blue-tinted icons and hover counts on config/equipment charts"
```

### Task 16c: Loading States & Chart Empty States (Spec Section 10)

**Files:**
- Modify: `src/components/statistics/StatisticsDashboard.tsx`
- Modify: `src/app/[locale]/page.tsx`

- [ ] **Step 1: Apply shimmer animation to skeleton loaders**

In `page.tsx`, the existing `<Skeleton>` elements for loading state should use the `animate-shimmer` class already defined in globals.css. Wrap them with the appropriate class.

- [ ] **Step 2: Add fade overlay on order list refresh**

When `fetchOrders()` is called (auto-refresh every 30s), add a brief `opacity-50` overlay on the orders section instead of doing a hard re-render. Use a `refreshing` state boolean.

- [ ] **Step 3: Stat cards zero-value display**

In `StatCard.tsx`, when the value is `0` or `'0'`, display "—" with muted styling instead of "0". Add logic: `const displayValue = value === 0 || value === '0' ? '—' : value`

- [ ] **Step 4: Commit**

```bash
git add src/components/statistics/StatisticsDashboard.tsx src/components/statistics/StatCard.tsx src/app/[locale]/page.tsx
git commit -m "feat: shimmer skeletons, fade refresh overlay, zero-value display"
```

---

## Chunk 5: Personal Tracking Page

### Task 17: Create `/track/[name]` Route and Page Shell

**Files:**
- Create: `src/app/[locale]/track/[name]/page.tsx`

- [ ] **Step 1: Create the page file**

Server component that:
1. Reads `name` from params (URL-decoded)
2. Queries orders with case-insensitive name match: `WHERE LOWER(name) = LOWER(?)`
3. If 0 matches: render not-found state with search bar
4. If 1 match: render full tracking view
5. If multiple: render disambiguation list
6. Generate dynamic metadata (OG tags) with `noindex` robots directive

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // ... fetch order, return dynamic OG meta with robots: 'noindex'
}
```

- [ ] **Step 2: Create basic layout**

Back breadcrumb + placeholder content for now. The sub-components come in subsequent tasks.

- [ ] **Step 3: Add translations**

Add `tracking` namespace to both message files:
```json
"tracking": {
  "backToOverview": "Zurück zur Übersicht",
  "orderNotFound": "Keine Bestellung gefunden",
  "orderNotFoundDescription": "Unter diesem Namen existiert keine Bestellung.",
  "multipleOrders": "Mehrere Bestellungen gefunden",
  "selectOrder": "Wähle die richtige Bestellung:",
  "deliveredFaster": "Schneller als {percent}% der Bestellungen",
  "basedOn": "Basierend auf {count} ähnlichen Bestellungen ({config})",
  "similarOrders": "Ähnliche Bestellungen",
  "fewSimilar": "Wenige vergleichbare Bestellungen verfügbar",
  "shareOrder": "Teilen",
  "linkCopied": "Link kopiert!",
  "yourDelivery": "Deine voraussichtliche Lieferung",
  "orderDetails": "Bestelldetails"
}
```

- [ ] **Step 4: Run build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/track/ messages/de.json messages/en.json
git commit -m "feat: /track/[name] route with server-side order lookup"
```

### Task 18: Progress Timeline Component

**Files:**
- Create: `src/components/ProgressTimeline.tsx`

- [ ] **Step 1: Create large visual timeline**

A horizontal 4-step timeline: Bestellt → VIN erhalten → Papiere → Geliefert
- Each step: large circle (h-12 w-12) with icon, label below, date if available
- Connecting lines between steps, filled up to current step
- Current step: subtle pulse animation (Framer Motion, gated on `useReducedMotion`)
- Delivered step: green color
- Scheduled delivery: amber color
- `role="progressbar"` with `aria-valuenow` (0-100)

- [ ] **Step 2: Commit**

```bash
git add src/components/ProgressTimeline.tsx
git commit -m "feat: large progress timeline component for tracking page"
```

### Task 19: Similar Orders Component

**Files:**
- Create: `src/components/SimilarOrders.tsx`

- [ ] **Step 1: Create the component**

Accepts `orders: Order[]` (pre-fetched server-side) and `currentOrder: Order`.
- Shows a compact card list with: name, order date, vehicle badge, delivery date (or "Ausstehend"), and orderToDelivery days
- If fewer than 3 orders: show note "Wenige vergleichbare Bestellungen verfügbar"

- [ ] **Step 2: Commit**

```bash
git add src/components/SimilarOrders.tsx
git commit -m "feat: similar orders comparison component"
```

### Task 20: Assemble Full Tracking Page

**Files:**
- Modify: `src/app/[locale]/track/[name]/page.tsx`

- [ ] **Step 1: Wire all sub-components together**

The page layout (top to bottom):
1. Back breadcrumb
2. Order hero card (large car image + name + config badges)
3. `<ProgressTimeline order={order} />`
4. Delivery prediction (use existing `predictDelivery()` server-side, pass result as props)
5. `<SupportCard />` (donation ask)
6. `<SimilarOrders orders={similar} currentOrder={order} />`
7. Details grid (all order fields)
8. Actions (edit button, share button)

- [ ] **Step 2: Implement similar orders server-side query**

In the page's data fetching:
```typescript
let similar = await prisma.order.findMany({
  where: { vehicleType: order.vehicleType, model: order.model, deliveryDate: { not: null }, id: { not: order.id } },
  orderBy: { orderDate: 'desc' },
  take: 8,
})
if (similar.length < 3) {
  similar = await prisma.order.findMany({
    where: { vehicleType: order.vehicleType, drive: order.drive, deliveryDate: { not: null }, id: { not: order.id } },
    orderBy: { orderDate: 'desc' },
    take: 8,
  })
}
```

- [ ] **Step 3: Add confetti for delivered orders**

If order is delivered, trigger confetti on client mount (dynamic import of existing `DeliveryCelebration`).

- [ ] **Step 4: Run build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: full personal tracking page with prediction, similar orders, celebration"
```

---

## Chunk 6: Order Form Page & Donation Integration

### Task 21: Create `/new` Order Form Page

**Files:**
- Create: `src/app/[locale]/new/page.tsx`
- Modify: `src/components/OrderForm.tsx`

- [ ] **Step 1: Add `mode` prop to OrderForm**

Add `mode?: 'page' | 'modal'` prop (default: `'modal'`). When `mode === 'page'`:
- Don't wrap in `<Dialog>`. Render form content directly.
- On success: show inline success state instead of calling `onOpenChange(false)`
- Success state shows: "Bestellung erstellt!" + password/code info + two buttons: "Zur Übersicht" (→ `/`) and "Meine Bestellung ansehen" (→ `/track/[name]`)

- [ ] **Step 2: Create `/new/page.tsx`**

Client component that renders `<OrderForm mode="page" />` with appropriate callbacks.

- [ ] **Step 3: Update header "Neue Bestellung" link**

In `Header.tsx`, the CTA button links to `/new` instead of opening the form modal.

- [ ] **Step 4: Keep modal form for editing**

The edit flow stays modal-based — only new order creation moves to a dedicated page.

- [ ] **Step 5: Run build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/new/ src/components/OrderForm.tsx src/components/Header.tsx
git commit -m "feat: /new page for order creation, OrderForm supports page mode"
```

### Task 22: Support Card Component

**Files:**
- Create: `src/components/SupportCard.tsx`

- [ ] **Step 1: Create the component**

A warm, non-intrusive card:
- Icon: coffee or heart
- Text: "Diese Daten werden von der Community für die Community gepflegt. Wenn dir die Seite hilft, kannst du die Serverkosten unterstützen."
- Button: "☕ Unterstützen" → donation URL from settings
- Props: `donationUrl: string`

- [ ] **Step 2: Wire into tracking page**

Already referenced in Task 20. The tracking page passes `settings.donationUrl` to SupportCard.

- [ ] **Step 3: Add translations**

```json
"support": {
  "communityMessage": "Diese Daten werden von der Community für die Community gepflegt. Wenn dir die Seite hilft, kannst du die Serverkosten unterstützen.",
  "supportButton": "Unterstützen"
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SupportCard.tsx messages/de.json messages/en.json
git commit -m "feat: support card for post-value donation ask"
```

### Task 23: Prisma Schema Update for Donation Bar

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to Settings model**

```prisma
model Settings {
  // ... existing fields ...
  yearlyGoal    Int?
  yearlyRaised  Int?
}
```

- [ ] **Step 2: Push schema change**

```bash
npx prisma db push
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add yearlyGoal/yearlyRaised to Settings for transparency bar"
```

---

## Chunk 7: Translation Updates & Final Polish

### Task 24: Complete Translation Updates

**Files:**
- Modify: `messages/de.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add all remaining translation keys**

Ensure all new namespaces are complete:
- `hero` (title, subtitle, findMyOrder)
- `tracking` (all keys from Task 17)
- `support` (communityMessage, supportButton)
- `footer` (operatedBy, supportDevelopment, serverCosts)
- Update `statistics.speed` with `fastestConfig`
- Update micro-copy: warmer tone where applicable

- [ ] **Step 2: Commit**

```bash
git add messages/de.json messages/en.json
git commit -m "feat: complete i18n for redesign — hero, tracking, support, footer namespaces"
```

### Task 25: Delete Deprecated Components

**Files:**
- Delete: `src/components/TrustSignals.tsx`
- Delete: `src/components/DonationBanner.tsx`
- Modify: `src/components/admin/SettingsTab.tsx` (references DonationBanner)

- [ ] **Step 1: Remove files and all imports**

Search for ALL imports/references of `TrustSignals` and `DonationBanner` across the codebase:
- `src/app/[locale]/page.tsx` — TrustSignals import (should already be replaced by CommunityPulse in Task 5)
- `src/app/[locale]/page.tsx` — DonationBanner import and usage in footer (should already be replaced by Footer component in Task 3)
- `src/components/admin/SettingsTab.tsx` — may reference DonationBanner for the admin donation settings UI. Update to reference the new Footer donation link instead, or simply remove the import if it's just a type reference.

Delete the two files. Remove any remaining dangling imports.

- [ ] **Step 2: Run build to verify nothing is broken**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated TrustSignals and DonationBanner components"
```

### Task 26: Final Build & Visual Verification

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: Compiled successfully, no TypeScript errors.

- [ ] **Step 2: Visual spot-check at key breakpoints**

Use Playwright or browser dev tools to verify:
- 390px (mobile): header compact, filters collapsed, stat cards 2-col, quarter headers single-line
- 768px (tablet): header doesn't break, stat cards 2-col (not 4), tabs visible
- 1440px (desktop): full layout, 4-col stat cards, all features visible

- [ ] **Step 3: Check both light and dark mode**

- [ ] **Step 4: Verify `/track/[name]` with a known order name**

- [ ] **Step 5: Verify `/new` page form submission flow**

- [ ] **Step 6: Final commit if any fixes needed**

---

## Execution Order Summary

| Chunk | Tasks | Dependencies |
|-------|-------|-------------|
| 1: Foundation | 1, 1b, 2 | None |
| 2: Shared Layout | 3, 4, 5 | Chunk 1 |
| 3: Responsive Fixes | 6-10, 10b, 10c | Chunk 2 |
| 4: Dashboard Polish | 11-16, 16b, 16c | Chunk 1 |
| 5: Personal Tracking | 17-20 | Chunk 2 |
| 6: Order Form & Donations | 21-23 | Chunk 2 |
| 7: Final Polish | 24-26 | All above |

**Parallelizable:** Chunks 3, 4, 5, and 6 can run in parallel after Chunk 2 completes.

**Translation merge conflict note:** Chunks 4, 5, and 6 all modify `messages/de.json` and `messages/en.json`. If running in parallel, each chunk should add its translation keys to unique namespaces (which they do: `speed`, `tracking`, `support`, `footer`). The final merge in Chunk 7 (Task 24) will consolidate any conflicts. Alternatively, serialize the translation additions by having Task 24 run after all other chunks complete (which is already the case since it's in Chunk 7).
