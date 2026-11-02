import type { NextResponse } from 'next/server'
import type { ApiConsumer } from './api-consumers'
import { ApiErrors } from './api-response'
import { findDateSequenceError } from './date-utils'
import { checkRateLimit, clientKey } from './rate-limit'

/**
 * New orders per client address per key and hour. A key built into an app is
 * shared by all its users and can be pulled out of the app, so its per-key
 * limits cannot tell one user from a flood; this can. An honest client creates
 * one order per car. Higher than the web form's 5, because mobile carriers put
 * many phones behind one address.
 */
export const V1_CREATE_RULE = { limit: 10, windowMs: 60 * 60 * 1000 }

/** A 429 when this caller has created too many orders lately, else null. Built-in keys are never braked. */
export function createBrake(request: Request, consumer: ApiConsumer | null, now = Date.now()): NextResponse | null {
  if (!consumer || consumer.builtin) return null
  const limit = checkRateLimit(clientKey(request, `v1-create:${consumer.id}`), V1_CREATE_RULE, now)
  if (limit.allowed) return null
  return ApiErrors.rateLimited(
    `At most ${V1_CREATE_RULE.limit} new orders per hour from one address`,
    limit.retryAfterSeconds,
  )
}

/**
 * The chronology check the web form applies. Pass the merged order on update:
 * a single new date only becomes implausible next to the stored ones.
 */
export function dateSequenceProblem(data: Record<string, unknown>): NextResponse | null {
  const code = findDateSequenceError(data)
  return code ? ApiErrors.validationError('Dates are not in a plausible order', { dates: code }) : null
}
