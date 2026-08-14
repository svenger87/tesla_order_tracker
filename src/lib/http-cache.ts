import { createHash } from 'crypto'

/**
 * Entity tag for a JSON payload.
 *
 * The orders list is polled every 30 seconds by every open tab and returns the
 * full dataset with no pagination. Hashing the serialized payload lets an
 * unchanged poll answer 304 with an empty body instead of resending everything.
 */
export function computeETag(payload: unknown): string {
  const hash = createHash('sha1').update(JSON.stringify(payload)).digest('hex')
  return `"${hash}"`
}

/**
 * Whether an If-None-Match header satisfies the current entity tag.
 *
 * Accepts a comma-separated list, the `*` wildcard, and weak validators —
 * proxies routinely downgrade a strong tag to `W/"..."` in transit, and
 * treating that as a miss would defeat the whole mechanism.
 */
export function isNotModified(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false

  const normalize = (tag: string) => tag.trim().replace(/^W\//, '')
  const current = normalize(etag)

  return ifNoneMatch
    .split(',')
    .map(normalize)
    .some(candidate => candidate === '*' || candidate === current)
}
