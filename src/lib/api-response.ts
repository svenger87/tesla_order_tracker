import { NextResponse } from 'next/server'

interface ApiMeta {
  timestamp: string
  version: string
  pagination?: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  count?: number
}

interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta: ApiMeta
}

interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string>
  }
  meta: ApiMeta
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export function createApiSuccessResponse<T>(
  data: T,
  options?: {
    status?: number
    pagination?: ApiMeta['pagination']
    count?: number
  }
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
        ...(options?.pagination && { pagination: options.pagination }),
        ...(options?.count !== undefined && { count: options.count }),
      },
    },
    { status: options?.status ?? 200 }
  )
}

export function createApiErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, string>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    },
    { status }
  )
}

// Common error responses
export const ApiErrors = {
  unauthorized: (message = 'API key required') =>
    createApiErrorResponse('UNAUTHORIZED', message, 401),

  invalidApiKey: () =>
    createApiErrorResponse('UNAUTHORIZED', 'Invalid API key', 401),

  notFound: (resource = 'Resource') =>
    createApiErrorResponse('NOT_FOUND', `${resource} not found`, 404),

  validationError: (message: string, details?: Record<string, string>) =>
    createApiErrorResponse('VALIDATION_ERROR', message, 400, details),

  conflict: (message: string) =>
    createApiErrorResponse('CONFLICT', message, 409),

  serverError: (message = 'Internal server error') =>
    createApiErrorResponse('SERVER_ERROR', message, 500),
}
