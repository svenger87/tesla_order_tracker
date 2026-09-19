import { NextRequest, NextResponse } from 'next/server'
import { ApiErrors } from './api-response'
import { secretsMatch } from './secrets'
import type { ApiScope } from './api-scopes'
import { envKeys, resolveConsumer, type ApiConsumer, type EnvKeys } from './api-consumers'
import { prismaApiKeyLookup, prismaUsageStore, type ApiKeyLookup } from './api-key-store'
import { secondsUntilUtcMidnight, utcDay, type UsageStore } from './api-usage'
import { checkRateLimit } from './rate-limit'

export { secretsMatch }

export function validateApiKey(request: NextRequest): { valid: boolean; error?: NextResponse } {
  const apiKey = request.headers.get('X-API-Key')
  const expectedKey = process.env.EXTERNAL_API_KEY

  if (!expectedKey) {
    console.error('EXTERNAL_API_KEY environment variable not set')
    return {
      valid: false,
      error: ApiErrors.serverError('API not configured'),
    }
  }

  if (!apiKey) {
    return {
      valid: false,
      error: ApiErrors.unauthorized('API key required. Use X-API-Key header.'),
    }
  }

  if (!secretsMatch(apiKey, expectedKey)) {
    return {
      valid: false,
      error: ApiErrors.invalidApiKey(),
    }
  }

  return { valid: true }
}

export interface ApiRouteOptions {
  /** The scope a key needs for this route. */
  scope: ApiScope
  /** Stable label for usage stats, e.g. "GET /v1/orders/[id]". */
  route: string
}

export interface GateDeps {
  env: EnvKeys
  lookup: ApiKeyLookup
  usage: UsageStore
  now: () => number
}

export function productionGateDeps(): GateDeps {
  return { env: envKeys(), lookup: prismaApiKeyLookup, usage: prismaUsageStore, now: Date.now }
}

export type GateResult =
  | { ok: true; consumer: ApiConsumer; headers: Record<string, string> }
  | { ok: false; consumer: ApiConsumer | null; response: NextResponse }

function withHeaders(response: NextResponse, headers: Record<string, string>) {
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value)
  return response
}

/** Identifies the caller, then checks scope, per-minute limit and daily quota — in that order. */
export async function authorizeApiRequest(
  request: NextRequest,
  opts: ApiRouteOptions,
  deps: GateDeps,
): Promise<GateResult> {
  const now = deps.now()
  const secret = request.headers.get('X-API-Key') || ''
  const consumer = secret
    ? await resolveConsumer(secret, opts.scope, { env: deps.env, lookup: deps.lookup, now })
    : null

  if (!consumer) {
    // Before per-consumer keys, an unset env var answered 500 for its route
    // family. Kept, so a misconfigured deployment still reports itself the same way.
    const tost = opts.scope === 'tost'
    if (!(tost ? deps.env.tost : deps.env.external)) {
      console.error(`${tost ? 'TOST_API_KEY' : 'EXTERNAL_API_KEY'} environment variable not set`)
      return { ok: false, consumer: null, response: ApiErrors.serverError(tost ? 'TOST API not configured' : 'API not configured') }
    }
    return {
      ok: false,
      consumer: null,
      response: secret ? ApiErrors.invalidApiKey() : ApiErrors.unauthorized('API key required. Use X-API-Key header.'),
    }
  }

  if (!consumer.scopes.includes(opts.scope)) {
    return { ok: false, consumer, response: ApiErrors.insufficientScope(opts.scope) }
  }

  const headers: Record<string, string> = {}

  if (consumer.ratePerMinute !== null) {
    const limit = checkRateLimit(`api:${consumer.id}`, { limit: consumer.ratePerMinute, windowMs: 60_000 }, now)
    headers['X-RateLimit-Limit'] = String(consumer.ratePerMinute)
    headers['X-RateLimit-Remaining'] = String(limit.remaining)
    if (!limit.allowed) {
      return {
        ok: false,
        consumer,
        response: withHeaders(
          ApiErrors.rateLimited(`Rate limit of ${consumer.ratePerMinute} requests per minute exceeded`, limit.retryAfterSeconds),
          headers,
        ),
      }
    }
  }

  if (consumer.quotaPerDay !== null) {
    let used = 0
    try {
      used = await deps.usage.requestsOn(consumer.id, utcDay(now))
    } catch (error) {
      // Fail open: a counting problem must not take the API down.
      console.error('Failed to read API quota usage:', error)
    }
    if (used >= consumer.quotaPerDay) {
      headers['X-Quota-Remaining'] = '0'
      return {
        ok: false,
        consumer,
        response: withHeaders(
          ApiErrors.rateLimited(`Daily quota of ${consumer.quotaPerDay} requests exceeded`, secondsUntilUtcMidnight(now)),
          headers,
        ),
      }
    }
    headers['X-Quota-Remaining'] = String(consumer.quotaPerDay - used - 1)
  }

  return { ok: true, consumer, headers }
}

// Keyed by the request object, so handlers can ask who is calling without
// every route handler signature changing.
const consumers = new WeakMap<Request, ApiConsumer>()

/** The consumer the gate let through for this request, or null. */
export function getApiConsumer(request: Request): ApiConsumer | null {
  return consumers.get(request) ?? null
}

export function withApiAuth<T extends unknown[]>(
  opts: ApiRouteOptions,
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  deps: () => GateDeps = productionGateDeps,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const d = deps()
    const gate = await authorizeApiRequest(request, opts, d)

    let response: NextResponse
    if (gate.ok) {
      consumers.set(request, gate.consumer)
      response = withHeaders(await handler(request, ...args), gate.headers)
    } else {
      response = gate.response
    }

    // Requests nobody can be identified for are not counted: there is no one to count them against.
    if (gate.consumer) {
      const at = new Date(d.now())
      try {
        d.usage.record({
          consumerId: gate.consumer.id,
          builtin: gate.consumer.builtin,
          day: utcDay(at.getTime()),
          endpoint: opts.route,
          isError: response.status >= 400,
          at,
        }).catch(error => console.error('Failed to record API usage:', error))
      } catch (error) {
        console.error('Failed to record API usage:', error)
      }
    }

    return response
  }
}

// Type for Next.js dynamic route context
export interface RouteContext<T extends Record<string, string> = Record<string, string>> {
  params: Promise<T>
}
