import { COLORS } from './types'

export type ColorInfo = (typeof COLORS)[number]

/**
 * Exact lookup by internal value or display label.
 *
 * The previous implementations — one in OrderTable, a second in the track page —
 * fell back to substring matching in both directions against a map that also
 * held individual words as keys. "black" matched whichever of Solid Black,
 * Diamond Black or Midnight Cherry Red came first in iteration order, so the
 * swatch next to a colour name could be the wrong colour entirely.
 *
 * An ambiguous fragment now returns null and the caller shows no swatch, which
 * is honest, rather than a confident wrong answer.
 */
const byKey = new Map<string, ColorInfo>()

for (const color of COLORS) {
  byKey.set(color.value.toLowerCase(), color)
  byKey.set(color.label.toLowerCase(), color)
  // Stored data mixes both forms: "Deep Blue Metallic" and "deep_blue_metallic".
  byKey.set(color.label.toLowerCase().replace(/\s+/g, '_'), color)
}

export function findColorInfo(colorLabel: string | null | undefined): ColorInfo | null {
  if (!colorLabel) return null
  const key = colorLabel.trim().toLowerCase()
  if (!key) return null
  return byKey.get(key) ?? byKey.get(key.replace(/\s+/g, '_')) ?? null
}
