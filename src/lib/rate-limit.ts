/**
 * In-memory fixed-window rate limiter.
 *
 * The app runs as a single container against a local SQLite file, so per-process
 * state is the honest scope here — no shared store to keep in sync. If the
 * deployment ever grows a second replica this needs to move to a shared backend,
 * because each replica would otherwise grant the full budget on its own.
 *
 * Caddy would be the more usual place for this, but rate limiting is not in
 * standard Caddy — it needs a plugin and therefore a custom build. Doing it here
 * keeps the limit in the same repository as the routes it protects.
 */

export interface RateLimitRule {
  /** Requests permitted per window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the current window resets. Zero when allowed. */
  retryAfterSeconds: number
}

interface Window {
  count: number
  startedAt: number
}

const windows = new Map<string, Window>()

/** Stops the map from growing without bound on a long-running process. */
const MAX_TRACKED_KEYS = 10_000

function evictExpired(now: number, windowMs: number) {
  for (const [key, window] of windows) {
    if (now - window.startedAt >= windowMs) windows.delete(key)
  }
}

export function checkRateLimit(
  key: string,
  rule: RateLimitRule,
  now: number = Date.now(),
): RateLimitResult {
  const existing = windows.get(key)

  if (!existing || now - existing.startedAt >= rule.windowMs) {
    if (windows.size >= MAX_TRACKED_KEYS) evictExpired(now, rule.windowMs)
    windows.set(key, { count: 1, startedAt: now })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (existing.count < rule.limit) {
    existing.count++
    return { allowed: true, retryAfterSeconds: 0 }
  }

  const msLeft = existing.startedAt + rule.windowMs - now
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil(msLeft / 1000)),
  }
}

/** Test seam — production code never needs this. */
export function resetRateLimits() {
  windows.clear()
}

/**
 * Best-effort client address. Caddy sets X-Forwarded-For; the last entry is the
 * one Caddy itself observed and is the only one a client cannot spoof.
 */
export function clientKey(request: Request, bucket: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded
    ? forwarded.split(',').map(p => p.trim()).filter(Boolean).pop()
    : null
  return `${bucket}:${ip ?? 'unknown'}`
}
