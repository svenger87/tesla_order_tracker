import { timingSafeEqual } from 'crypto'

/** Constant-time comparison that does not leak the length via early return. */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) {
    // Still burn a comparison so the timing does not depend on length alone.
    timingSafeEqual(a, a)
    return false
  }
  return timingSafeEqual(a, b)
}
