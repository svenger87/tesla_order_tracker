import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { ApiErrors } from './api-response'

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

// Higher-order function wrapper for route handlers
export function withApiAuth<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const { valid, error } = validateApiKey(request)
    if (!valid) return error!
    return handler(request, ...args)
  }
}

// Type for Next.js dynamic route context
export interface RouteContext<T extends Record<string, string> = Record<string, string>> {
  params: Promise<T>
}
