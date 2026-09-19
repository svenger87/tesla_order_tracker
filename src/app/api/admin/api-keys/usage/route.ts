import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { usageRows } from '@/lib/api-key-store'
import { summarizeUsage, utcDay } from '@/lib/api-usage'

// GET /api/admin/api-keys/usage?consumer=<id>&days=30 — daily series and per-endpoint totals (admin only)
export async function GET(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const consumer = searchParams.get('consumer')
  if (!consumer) return NextResponse.json({ error: 'consumer is required' }, { status: 400 })
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30') || 30, 1), 90)

  try {
    const now = Date.now()
    const since = utcDay(now - (days - 1) * 86_400_000)
    return NextResponse.json(summarizeUsage(await usageRows(consumer, since), days, now))
  } catch (error) {
    console.error('Failed to read API usage:', error)
    return NextResponse.json({ error: 'Failed to read API usage' }, { status: 500 })
  }
}
