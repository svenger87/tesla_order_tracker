import { parseGermanDate } from './date-utils'

/**
 * Month names in the languages Tesla actually shows the window in. The field is
 * free text copied out of somebody's account, so a German site holds Dutch,
 * French and English months side by side — "22 Augustus - 1 September" and
 * "juil. - août 2026" are both live values.
 *
 * Matching is by prefix, which is what makes the abbreviations work: "Nov",
 * "Dez", "juil.", "Okt." Three letters is the shortest prefix accepted, so "j"
 * never silently becomes January.
 */
const MONTH_NAMES: Record<string, string> = {
  de: 'januar februar märz april mai juni juli august september oktober november dezember',
  en: 'january february march april may june july august september october november december',
  fr: 'janvier février mars avril mai juin juillet août septembre octobre novembre décembre',
  nl: 'januari februari maart april mei juni juli augustus september oktober november december',
  it: 'gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre',
  es: 'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre',
  pt: 'janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro',
  // Polish months appear in the genitive, which is how a date is written there.
  pl: 'stycznia lutego marca kwietnia maja czerwca lipca sierpnia września października listopada grudnia',
  sv: 'januari februari mars april maj juni juli augusti september oktober november december',
  da: 'januar februar marts april maj juni juli august september oktober november december',
}

const MONTHS = new Map<string, number>()
for (const names of Object.values(MONTH_NAMES)) {
  names.split(' ').forEach((name, i) => MONTHS.set(name, i + 1))
}

/** May is three letters in several languages, so exact matches win outright. */
function monthFromWord(word: string): number | null {
  const w = word.toLowerCase().replace(/[.\s]/g, '')
  if (!w) return null
  const exact = MONTHS.get(w)
  if (exact) return exact
  if (w.length < 3) return null

  let found: number | null = null
  for (const [name, index] of MONTHS) {
    if (!name.startsWith(w)) continue
    if (found !== null && found !== index) return null // ambiguous prefix
    found = index
  }
  return found
}

/**
 * Whether a string writes its numeric dates day-first or month-first, judged by
 * every number pair it contains. Null when both readings survive, or neither.
 */
function detectConvention(text: string): 'day-first' | 'month-first' | null {
  // Drop four-digit years first so they cannot be mistaken for a pair member.
  const withoutYears = text.replace(/(?<!\d)20\d{2}(?!\d)/g, ' ')
  const pairs = [...withoutYears.matchAll(/(\d{1,2})[./](\d{1,2})/g)]
    .map(m => [Number(m[1]), Number(m[2])] as const)
  if (pairs.length === 0) return null

  const dayFirst = pairs.every(([, second]) => second >= 1 && second <= 12)
  const monthFirst = pairs.every(([first]) => first >= 1 && first <= 12)

  if (dayFirst && !monthFirst) return 'day-first'
  if (monthFirst && !dayFirst) return 'month-first'

  // Both fit. The separator is the remaining evidence and it is good evidence:
  // every European value in this data writes dots and every American one writes
  // slashes. "12.08.2026" is the 12th of August wherever dots are used, so only
  // the slash form is genuinely contested and left for the caller to settle.
  if (dayFirst && /\d\.\d/.test(withoutYears)) return 'day-first'

  return null
}

function isRealDate(day: number, month: number, year: number): boolean {
  const probe = new Date(year, month - 1, day)
  return probe.getFullYear() === year && probe.getMonth() === month - 1 && probe.getDate() === day
}

type Parsed = { day: number | null; month: number; year: number | null }

function readStart(text: string, convention: 'day-first' | 'month-first'): Parsed | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  // A four-digit year anywhere in the string belongs to the window; the last one
  // is the end of the range, which is the year the start shares unless the start
  // carries its own.
  const years = trimmed.match(/(?<!\d)(20\d{2})(?!\d)/g)
  const trailingYear = years ? Number(years[years.length - 1]) : null

  // "03.-30.09.2026" and "26-30.09." — the start is a bare day and borrows the
  // month written after the dash. Unambiguous: nothing else can follow a lone
  // day and a separator.
  const sharedMonth = trimmed.match(/^(\d{1,2})\.?\s*[-–]\s*\d{1,2}[./](\d{1,2})[./]?/)
  if (sharedMonth) {
    const day = Number(sharedMonth[1])
    const month = Number(sharedMonth[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { day, month, year: trailingYear }
    }
  }

  // "09/2026", "01/2027-02/2027" — a month and a full year, no day. A four-digit
  // second part cannot be a day, so there is nothing to weigh up.
  const monthFullYear = trimmed.match(/^(\d{1,2})[./](\d{4})(?!\d)/)
  if (monthFullYear) {
    const month = Number(monthFullYear[1])
    if (month >= 1 && month <= 12) {
      return { day: null, month, year: Number(monthFullYear[2]) }
    }
  }

  // "11.26 -12.26" — a month and a two-digit year. This one has to be earned:
  // "08/22" looks identical and means 22 August in the month-first convention,
  // and "07/13" is 13 July, not July 2013 — which is what a plain "second part
  // is over twelve" rule turned it into. So the short year has to be a year this
  // data could actually contain, and the string must spell no year out anywhere.
  const monthShortYear = trimmed.match(/^(\d{1,2})[./](\d{2})(?!\d)/)
  if (monthShortYear && trailingYear === null) {
    const month = Number(monthShortYear[1])
    const shortYear = 2000 + Number(monthShortYear[2])
    const currentYear = new Date().getFullYear()
    const plausible = shortYear >= currentYear - 1 && shortYear <= currentYear + 6
    if (month >= 1 && month <= 12 && plausible) {
      return { day: null, month, year: shortYear }
    }
  }

  // 17.10.2026 / 17.10. / 04/10 / 09/01-09/30/2026
  const numeric = trimmed.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?/)
  if (numeric) {
    const first = Number(numeric[1])
    const second = Number(numeric[2])
    const year = numeric[3] ? Number(numeric[3]) : trailingYear

    // Which way round a row is written can be read off the whole string rather
    // than assumed. Every number pair in it has to fit the same convention, so
    // one impossible month anywhere settles it: "09/01-09/30/2026" has no 30th
    // month, therefore the row is month-first and starts on 1 September. Read
    // day-first it became the 9th of January, four months before its own order.
    // When both conventions fit every pair, nothing in the text decides it and
    // the value is refused rather than guessed.
    const day = convention === 'day-first' ? first : second
    const month = convention === 'day-first' ? second : first
    if (day < 1 || day > 31 || month < 1 || month > 12) return null
    return { day, month, year }
  }

  // 19 September
  const dayThenName = trimmed.match(/^(\d{1,2})\s+([^\s\d\-–]+)/)
  if (dayThenName) {
    const month = monthFromWord(dayThenName[2])
    if (month) return { day: Number(dayThenName[1]), month, year: trailingYear }
  }

  // November 2026 / Nov - Dez 2026
  const nameOnly = trimmed.match(/^([^\s\d\-–]+)/)
  if (nameOnly) {
    const month = monthFromWord(nameOnly[1])
    if (month) return { day: null, month, year: trailingYear }
  }

  return null
}

type Convention = 'day-first' | 'month-first'

/**
 * A parsed start or end as a date. A part without a year takes `fallbackYear`
 * when given, otherwise the first year that places it on or after `notBefore`.
 */
function resolveParsed(parsed: Parsed | null, notBefore: Date | null): Date | null {
  if (!parsed) return null
  const day = parsed.day ?? 1

  if (parsed.year !== null) {
    return isRealDate(day, parsed.month, parsed.year)
      ? new Date(parsed.year, parsed.month - 1, day)
      : null
  }

  if (!notBefore) return null
  for (let year = notBefore.getFullYear(); year <= notBefore.getFullYear() + 1; year++) {
    if (!isRealDate(day, parsed.month, year)) continue
    const candidate = new Date(year, parsed.month - 1, day)
    if (candidate.getTime() >= notBefore.getTime()) return candidate
  }
  return null
}

/**
 * Which conventions a window can be read in, given only its own text: the one
 * it gives away, or both when every number pair fits either.
 */
function candidateConventions(window: string): Convention[] {
  const detected = detectConvention(window)
  return detected ? [detected] : ['day-first', 'month-first']
}

/**
 * When the text alone left both conventions standing, the order settles it: a
 * delivery window is a forecast, so a reading that lands before the order was
 * placed is not a reading of this window. When exactly one survives, it is the
 * answer; when both do, nothing decides and the value is refused.
 */
function pickUnique<T>(
  readings: T[],
  key: (r: T) => string,
  startOf: (r: T) => Date,
  ordered: Date | null,
): T | null {
  const unique = [...new Map(readings.map(r => [key(r), r])).values()]
  if (unique.length === 1) return unique[0]
  if (unique.length === 0 || !ordered) return null
  const after = unique.filter(r => startOf(r).getTime() >= ordered.getTime())
  return after.length === 1 ? after[0] : null
}

/**
 * The first day a delivery window covers, for sorting a column of them.
 *
 * The field is free text: 2963 of 3120 orders carry one, in 265 distinct
 * shapes, and the column offering to sort them was falling through to a plain
 * string comparison — which puts "29.08" after "04.10" because 2 beats 0.
 *
 * Used for ordering only. The stored text is what gets displayed, so nothing
 * derived here is ever shown as if it were a date somebody stated.
 *
 * When the text carries no year — half the values do not — it is taken from the
 * order the window belongs to: the first year that places the window after the
 * order was placed. A window is a forecast, so it cannot precede its own order.
 *
 * The form now writes "DD.MM.-DD.MM.YYYY" (same year) or
 * "DD.MM.YYYY-DD.MM.YYYY" (across years); both are read here.
 */
export function parseDeliveryWindowStart(
  window: string | null | undefined,
  orderDate: string | null | undefined,
): Date | null {
  if (!window) return null
  const ordered = parseGermanDate(orderDate)

  // "04/10-08/12/2026" is either 4 October or 10 April when nothing in the text
  // decides it; both readings are taken and the order picks between them.
  const readings = candidateConventions(window)
    .map(c => resolveParsed(readStart(window, c), ordered))
    .filter((d): d is Date => d !== null)

  return pickUnique(readings, d => String(d.getTime()), d => d, ordered)
}

export interface DeliveryWindowRange {
  start: Date
  end: Date
}

/**
 * Both ends of a delivery window, when the text names two days.
 *
 * Used by the form's range picker to preselect what is stored. Stricter than
 * the start parser on purpose: a window it cannot read to the day — "November
 * 2026", "Nov - Dez 2026", a single date — returns null, and the form leaves
 * the text as typed rather than replacing it with a guess.
 *
 * An end without a year is placed in the first year that keeps it on or after
 * the start, so "22 Dezember - 5 Januar" crosses into the next year.
 */
export function parseDeliveryWindowRange(
  window: string | null | undefined,
  orderDate: string | null | undefined,
): DeliveryWindowRange | null {
  if (!window) return null
  const parts = window.trim().split(/\s*[-–]\s*/)
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  const ordered = parseGermanDate(orderDate)

  const readings: DeliveryWindowRange[] = []
  for (const convention of candidateConventions(window)) {
    const startParsed = readStart(window, convention)
    const endParsed = readStart(parts[1], convention)
    if (!startParsed || startParsed.day === null) continue
    if (!endParsed || endParsed.day === null) continue

    const start = resolveParsed(startParsed, ordered)
    if (!start) continue
    const end = resolveParsed(endParsed, start)
    if (!end || end.getTime() < start.getTime()) continue
    readings.push({ start, end })
  }

  return pickUnique(
    readings,
    r => `${r.start.getTime()}-${r.end.getTime()}`,
    r => r.start,
    ordered,
  )
}

/**
 * The canonical text for a picked range: "DD.MM.-DD.MM.YYYY" when both ends
 * share a year, "DD.MM.YYYY-DD.MM.YYYY" when the window crosses one.
 */
export function formatDeliveryWindow(start: Date, end: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const dm = (d: Date) => `${p(d.getDate())}.${p(d.getMonth() + 1)}.`
  if (start.getFullYear() === end.getFullYear()) {
    return `${dm(start)}-${dm(end)}${end.getFullYear()}`
  }
  return `${dm(start)}${start.getFullYear()}-${dm(end)}${end.getFullYear()}`
}
