/**
 * The one categorical chart palette.
 *
 * Values live in globals.css as --chart-1..6 so the dark theme swaps them
 * automatically; these are CSS variable references, which SVG `fill` accepts.
 * Previously four chart components each carried their own hardcoded array —
 * with different values for the same role — and none of them changed in dark
 * mode.
 *
 * Slots are assigned in order and never cycled: a seventh category is not a
 * seventh hue, it belongs in an "other" bucket. The order is validated for
 * colour-vision separation in both themes; changing it needs a re-run of the
 * palette validator, not just a look.
 */
export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
] as const

/** How many distinct categories a chart may show before folding into "other". */
export const MAX_CATEGORICAL_SLOTS = CHART_COLORS.length

/**
 * Fill for a single-series chart. Bars in a one-measure chart get their
 * identity from the axis label, so painting each a different colour encodes
 * nothing — it just spends the categorical palette on decoration.
 */
export const CHART_SERIES_COLOR = 'var(--chart-1)'

/**
 * Shared Recharts tooltip styling.
 *
 * Every chart used to repeat this, written as `hsl(var(--card))` — invalid,
 * since the tokens are not HSL triplets, so the browser dropped it and the
 * tooltip fell back to the light Recharts default on a dark surface.
 */
export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--card-foreground)',
    fontSize: '12px',
    padding: '6px 10px',
    boxShadow: '0 4px 12px rgb(0 0 0 / 0.12)',
    // Narrow enough that Recharts can always flip it inside the chart; at
    // full width the tooltip on the last bar of a phone chart ran past the card.
    maxWidth: 'min(220px, 60vw)',
    whiteSpace: 'normal' as const,
  },
  itemStyle: { color: 'var(--card-foreground)', padding: 0 },
  labelStyle: { color: 'var(--card-foreground)', fontWeight: 600, marginBottom: 2 },
  // Above sibling axis labels, so a tooltip on a phone never reads as text
  // printed over the chart.
  wrapperStyle: { zIndex: 20, outline: 'none' },
} as const

/**
 * Hover cursor for bar charts: a faint band, not the default solid grey block
 * that covered the bar and its neighbours on a narrow screen.
 */
export const CHART_BAR_CURSOR = { fill: 'var(--muted-foreground)', fillOpacity: 0.08 } as const

/** Hover cursor for line/area charts. */
export const CHART_LINE_CURSOR = { stroke: 'var(--muted-foreground)', strokeOpacity: 0.4, strokeDasharray: '3 3' } as const

/** One tick size and colour for every axis, so charts side by side match. */
export const CHART_AXIS_FONT_SIZE = 11

export const CHART_AXIS_TICK = {
  fontSize: CHART_AXIS_FONT_SIZE,
  fill: 'var(--muted-foreground)',
} as const

/** Axis line and tick marks: present but quiet. */
export const CHART_AXIS_LINE = { stroke: 'var(--border)' } as const

/** Grid lines, for charts that draw one. */
export const CHART_GRID_STROKE = 'var(--border)'

/**
 * Outline for pie segments and legend swatches. Data colours include white
 * (Pearl White, a white interior) and near-black (Diamond Black), which vanish
 * against the card in one theme or the other; a thin foreground-tinted edge
 * keeps every slice visible in both.
 */
export const CHART_SEGMENT_STROKE = 'color-mix(in oklab, var(--foreground) 28%, transparent)'
