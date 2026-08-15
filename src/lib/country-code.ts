/**
 * Codes that mean a country this app already knows under another name.
 *
 * `gb` is the ISO code; this app settled on `uk` long ago, in the constant and
 * in the options table. The sync sends `gb`, the form writes `uk`, and neither
 * side was translating — so the United Kingdom sat in the statistics twice, 16
 * orders under one code and 13 under the other, and a duplicate check keyed on
 * country could never match a British order against its own copy.
 */
const ALIASES: Record<string, string> = {
  gb: 'uk',
}

/**
 * Bring a country code to the form the rest of the app uses.
 *
 * An unrecognised code passes through rather than being dropped: the order
 * belongs to some country, and guessing wrong is worse than carrying a code
 * nobody has a label for yet.
 */
export function normalizeCountryCode(input: string | null | undefined): string | null {
  if (!input) return null
  const code = input.trim().toLowerCase()
  if (!code) return null
  return ALIASES[code] ?? code
}
