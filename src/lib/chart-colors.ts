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
    color: 'var(--foreground)',
  },
  itemStyle: { color: 'var(--foreground)' },
  labelStyle: { color: 'var(--foreground)', fontWeight: 600 },
} as const
