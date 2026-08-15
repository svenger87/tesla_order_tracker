/**
 * Naming and flagging a country from its code alone.
 *
 * The admin option list stays the first source: it carries the labels and flags
 * somebody chose. This is what happens when a code is not in it — which is not
 * hypothetical, because the data arrives from a third-party sync that has no
 * idea what is in that list. us, ca and tw are all in the live orders and in
 * nobody's options, so they appeared as a bare "us" with no flag beside every
 * other country's.
 *
 * Deriving both from the code means no country can ever be flagless again for
 * the sole reason that nobody got round to adding it.
 */

/**
 * This app writes uk where the standard writes gb.
 *
 * That matters here twice over: Unicode has no UK flag, so the two letters
 * produce a pair of boxes rather than a flag, and Intl does not recognise the
 * region either.
 */
const TO_ISO: Record<string, string> = { uk: 'gb' }

const REGIONAL_INDICATOR_A = 0x1f1e6
const LETTER_A = 'a'.charCodeAt(0)

function isoCode(code: string | null | undefined): string | null {
  if (!code) return null
  const trimmed = code.trim().toLowerCase()
  if (!/^[a-z]{2}$/.test(trimmed)) return null
  return TO_ISO[trimmed] ?? trimmed
}

/** The flag emoji for an ISO 3166-1 alpha-2 code, or null if it is not one. */
export function flagFromCode(code: string | null | undefined): string | null {
  const iso = isoCode(code)
  if (!iso) return null

  return String.fromCodePoint(
    ...[...iso].map(ch => REGIONAL_INDICATOR_A + (ch.charCodeAt(0) - LETTER_A)),
  )
}

/**
 * The country's name in the reader's language, or null.
 *
 * fallback: 'none' matters. Left at its default, Intl answers a region it does
 * not know with the code it was handed, which would put "qx" on screen looking
 * like the name of a country.
 */
export function countryNameFromCode(
  code: string | null | undefined,
  locale: string,
): string | null {
  const iso = isoCode(code)
  if (!iso) return null

  try {
    const names = new Intl.DisplayNames([locale], { type: 'region', fallback: 'none' })
    const name = names.of(iso.toUpperCase())
    return name || null
  } catch {
    return null
  }
}
