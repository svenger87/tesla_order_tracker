import { NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

// GET /api/admin/api-key - Get the external API key (admin only)
export async function GET() {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const apiKey = process.env.EXTERNAL_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        configured: false,
        message: 'EXTERNAL_API_KEY is not configured',
      })
    }

    return NextResponse.json({
      configured: true,
      apiKey,
    })
  } catch (error) {
    console.error('Failed to get API key:', error)
    return NextResponse.json({ error: 'Failed to get API key' }, { status: 500 })
  }
}
