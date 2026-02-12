import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

// POST - Fix wheel labels in database
export async function POST(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  try {
    const fixes = [
      { value: '18', label: '18"' },
      { value: '19', label: '19"' },
      { value: '20', label: '20"' },
      { value: '21', label: '21"' },
    ]

    const results = []

    for (const fix of fixes) {
      const result = await prisma.option.updateMany({
        where: {
          type: 'wheels',
          value: fix.value,
        },
        data: {
          label: fix.label,
        },
      })
      results.push({ value: fix.value, updated: result.count })
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Wheel labels fixed',
    })
  } catch (error) {
    console.error('Failed to fix wheels:', error)
    return NextResponse.json({ error: 'Failed to fix wheels' }, { status: 500 })
  }
}
