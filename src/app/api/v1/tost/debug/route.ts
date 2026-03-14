import { NextRequest } from 'next/server'
import { withTostAuth } from '@/lib/tost-auth'
import { createApiSuccessResponse } from '@/lib/api-response'
import { getTostLogs, clearTostLogs } from '@/lib/tost-debug-log'

// GET /api/v1/tost/debug?limit=50 - Get recent TOST API call logs
export const GET = withTostAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100)

  const logs = getTostLogs(limit)

  return createApiSuccessResponse(logs, { count: logs.length })
})

// DELETE /api/v1/tost/debug - Clear all debug logs
export const DELETE = withTostAuth(async () => {
  clearTostLogs()
  return createApiSuccessResponse({ message: 'Debug logs cleared' })
})
