import type { NextResponse } from 'next/server'
import type { ApiConsumer } from './api-consumers'
import { ApiErrors } from './api-response'
import { findDateSequenceError } from './date-utils'
import { checkRateLimit, clientKey, peekRateLimit } from './rate-limit'

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

/** Updates per client address per key, the web form's write budget. */
export const V1_WRITE_RULE = { limit: 60, windowMs: 15 * 60 * 1000 }

/**
 * Wrong edit codes per order and hour, from anyone. A shared key lets anyone
 * try codes, so the budget belongs to the order being guessed at, not to the
 * caller: switching addresses or keys does not buy more guesses. An honest app
 * holds the right code and never gets near it.
 */
export const V1_FAILED_CODE_RULE = { limit: 10, windowMs: 60 * 60 * 1000 }

/** A 429 when this caller has sent too many updates lately, else null. Built-in keys are never braked. */
export function writeBrake(request: Request, consumer: ApiConsumer | null, now = Date.now()): NextResponse | null {
  if (!consumer || consumer.builtin) return null
  const limit = checkRateLimit(clientKey(request, `v1-write:${consumer.id}`), V1_WRITE_RULE, now)
  if (limit.allowed) return null
  return ApiErrors.rateLimited(
    `At most ${V1_WRITE_RULE.limit} updates per ${V1_WRITE_RULE.windowMs / 60_000} minutes from one address`,
    limit.retryAfterSeconds,
  )
}

/** A 429 while the order is locked after too many wrong codes, else null. Does not count. */
export function failedCodeLock(orderId: string, now = Date.now()): NextResponse | null {
  const limit = peekRateLimit(`v1-bad-code:${orderId}`, V1_FAILED_CODE_RULE, now)
  if (limit.allowed) return null
  return ApiErrors.rateLimited('Too many wrong edit codes for this order; try again later', limit.retryAfterSeconds)
}

export function recordFailedCode(orderId: string, now = Date.now()) {
  checkRateLimit(`v1-bad-code:${orderId}`, V1_FAILED_CODE_RULE, now)
}

/**
 * The chronology check the web form applies. Pass the merged order on update:
 * a single new date only becomes implausible next to the stored ones.
 */
export function dateSequenceProblem(data: Record<string, unknown>): NextResponse | null {
  const code = findDateSequenceError(data)
  return code ? ApiErrors.validationError('Dates are not in a plausible order', { dates: code }) : null
}
