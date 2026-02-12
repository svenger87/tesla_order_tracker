import { NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

export async function GET() {
  const admin = await getAdminFromCookie()
  if (!admin) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  return NextResponse.json({ authenticated: true, username: admin.username })
}
