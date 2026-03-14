import { NextRequest, NextResponse } from 'next/server'
import { ApiErrors } from './api-response'
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

  if (apiKey !== expectedKey) {
    return {
      valid: false,
      error: ApiErrors.invalidApiKey(),
    }
  }

  return { valid: true }
}

export function withTostAuth<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const start = Date.now()
    const { valid, error } = validateTostApiKey(request)

    if (!valid) {
      addTostLog({
        timestamp: new Date().toISOString(),
        method: request.method,
        path: new URL(request.url).pathname,
        responseStatus: 401,
        responseBody: { error: 'Authentication failed' },
        durationMs: Date.now() - start,
      })
      return error!
    }

    // Clone request body for logging (only for methods with body)
    let requestBody: Record<string, unknown> | undefined
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      try {
        const cloned = request.clone()
        requestBody = await cloned.json()
      } catch {
        // no body or invalid JSON
      }
    } else {
      // Log query params for GET
      const params = Object.fromEntries(new URL(request.url).searchParams)
      if (Object.keys(params).length > 0) {
        requestBody = params
      }
    }

    const response = await handler(request, ...args)

    // Parse response for logging
    let responseBody: Record<string, unknown> | undefined
    let responseStatus = response.status
    try {
      const cloned = response.clone()
      responseBody = await cloned.json()
    } catch {
      // non-JSON response
    }

    addTostLog({
      timestamp: new Date().toISOString(),
      method: request.method,
      path: new URL(request.url).pathname,
      requestBody,
      responseStatus,
      responseBody,
      durationMs: Date.now() - start,
    })

    return response
  }
}
