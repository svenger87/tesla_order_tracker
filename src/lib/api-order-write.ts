import type { NextResponse } from 'next/server'
import type { ApiConsumer } from './api-consumers'
import { ApiErrors } from './api-response'
import { findDateSequenceError } from './date-utils'
import { checkRateLimit, clientKey, refundRateLimit } from './rate-limit'

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

/**
 * Wrong edit codes per caller (address and key) and hour. This is the limit
 * that stops guessing; an honest app holds the right code and never meets it.
 */
export const V1_CALLER_CODE_RULE = { limit: 10, windowMs: 60 * 60 * 1000 }

/**
 * Wrong edit codes per order and hour, from everyone together: the backstop
 * for guesses spread over many addresses. Set well above the per-caller limit,
 * so one caller alone cannot lock an owner out of their own order.
 */
export const V1_ORDER_CODE_RULE = { limit: 50, windowMs: 60 * 60 * 1000 }

function codeKeys(request: Request, consumer: ApiConsumer | null, orderId: string) {
  return {
    caller: clientKey(request, `v1-bad-code:${consumer?.id ?? 'none'}`),
    order: `v1-bad-code-order:${orderId}`,
  }
}

/**
 * Reserves one code attempt in both budgets before the code is checked, so
 * parallel requests cannot all slip through while a slow compare runs.
 * Returns a 429 when either budget is spent, else null. Call
 * refundCodeAttempt when the code turns out right.
 */
export function reserveCodeAttempt(request: Request, consumer: ApiConsumer | null, orderId: string, now = Date.now()): NextResponse | null {
  const keys = codeKeys(request, consumer, orderId)
  const caller = checkRateLimit(keys.caller, V1_CALLER_CODE_RULE, now)
  if (!caller.allowed) {
    return ApiErrors.rateLimited('Too many wrong edit codes; try again later', caller.retryAfterSeconds)
  }
  const order = checkRateLimit(keys.order, V1_ORDER_CODE_RULE, now)
  if (!order.allowed) {
    refundRateLimit(keys.caller, now)
    return ApiErrors.rateLimited('Too many wrong edit codes for this order; try again later', order.retryAfterSeconds)
  }
  return null
}

/** A right code was not a guess: give back what reserveCodeAttempt took at `reservedAt`. */
export function refundCodeAttempt(request: Request, consumer: ApiConsumer | null, orderId: string, reservedAt: number) {
  const keys = codeKeys(request, consumer, orderId)
  refundRateLimit(keys.caller, reservedAt)
  refundRateLimit(keys.order, reservedAt)
}

/**
 * The chronology check the web form applies. Pass the merged order on update:
 * a single new date only becomes implausible next to the stored ones.
 */
export function dateSequenceProblem(data: Record<string, unknown>): NextResponse | null {
  const code = findDateSequenceError(data)
  return code ? ApiErrors.validationError('Dates are not in a plausible order', { dates: code }) : null
}
