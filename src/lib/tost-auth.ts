import { NextRequest, NextResponse } from 'next/server'
import { ApiErrors } from './api-response'

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
    const { valid, error } = validateTostApiKey(request)
    if (!valid) return error!
    return handler(request, ...args)
  }
}
