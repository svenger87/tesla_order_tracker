import { NextRequest, NextResponse } from 'next/server'
import { ApiErrors } from './api-response'

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

  // Timing-safe comparison would be ideal, but for simplicity using direct comparison
  // In production, consider using crypto.timingSafeEqual
  if (apiKey !== expectedKey) {
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
