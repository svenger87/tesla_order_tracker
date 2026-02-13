import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'error', message: 'Database unreachable' }, { status: 503 })
  }
}
