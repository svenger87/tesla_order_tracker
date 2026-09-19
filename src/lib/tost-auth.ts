import { NextRequest, NextResponse } from 'next/server'
import { ApiErrors } from './api-response'
import { secretsMatch, withApiAuth, getApiConsumer, productionGateDeps, type GateDeps } from './api-auth'
import { addTostLog } from './tost-debug-log'

export function validateTostApiKey(request: NextRequest): { valid: boolean; error?: NextResponse } {
  const apiKey = request.headers.get('X-API-Key')
  const expectedKey = process.env.TOST_API_KEY

  if (!expectedKey) {
    console.error('TOST_API_KEY environment variable not set')
    return {
      valid: false,
      error: ApiErrors.serverError('TOST API not configured'),
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

/** "PUT /api/v1/tost/orders/abc" → "PUT /v1/tost/orders/[id]", for usage stats. */
export function tostRouteLabel(method: string, pathname: string): string {
  const path = pathname
    .replace(/^\/api/, '')
    .replace(/^(\/v1\/tost\/(?:orders|claim))\/[^/]+$/, '$1/[id]')
  return `${method} ${path}`
}

async function summarizeResponse(response: NextResponse): Promise<Record<string, unknown> | undefined> {
  try {
    const json = await response.clone().json()
    // Keep success/error/meta but summarize data arrays
    if (json.success && Array.isArray(json.data)) {
      return {
        success: json.success,
        count: json.data.length,
        ids: json.data.map((o: Record<string, unknown>) => o.id).filter(Boolean),
        meta: json.meta,
      }
    }
    if (json.success && json.data && typeof json.data === 'object') {
      return { success: json.success, data: json.data, meta: json.meta }
    }
    return { success: json.success, error: json.error, meta: json.meta }
  } catch {
    return undefined // non-JSON response
  }
}

/**
 * The TOST routes go through the same gate as every v1 route (scope "tost";
 * TOST_API_KEY resolves to an unlimited built-in consumer), and every call is
 * still written to the TOST debug log.
 */
export function withTostAuth<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  deps: () => GateDeps = productionGateDeps,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const start = Date.now()
    const path = new URL(request.url).pathname

    // Captured before the handler reads the body.
    let requestBody: Record<string, unknown> | undefined
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      try {
        requestBody = await request.clone().json()
      } catch {
        // no body or invalid JSON
      }
    } else {
      // Log query params for GET
      const params = Object.fromEntries(new URL(request.url).searchParams)
      if (Object.keys(params).length > 0) requestBody = params
    }

    const gated = withApiAuth({ scope: 'tost', route: tostRouteLabel(request.method, path) }, handler, deps)
    const response = await gated(request, ...args)
    const authorized = getApiConsumer(request) !== null

    addTostLog({
      timestamp: new Date().toISOString(),
      method: request.method,
      path,
      ...(authorized && { requestBody }),
      responseStatus: response.status,
      responseBody: !authorized && response.status === 401
        ? { error: 'Authentication failed' }
        : await summarizeResponse(response),
      durationMs: Date.now() - start,
    })

    return response
  }
}
