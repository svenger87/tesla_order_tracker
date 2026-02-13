import { execute, nowISO } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

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
    const now = nowISO()

    for (const fix of fixes) {
      const result = await execute(
        `UPDATE "Option" SET label = ?, updatedAt = ? WHERE type = 'wheels' AND value = ?`,
        [fix.label, now, fix.value],
      )
      results.push({ value: fix.value, updated: result.rowsAffected })
    }

    return NextResponse.json({ success: true, results, message: 'Wheel labels fixed' })
  } catch (error) {
    console.error('Failed to fix wheels:', error)
    return NextResponse.json({ error: 'Failed to fix wheels' }, { status: 500 })
  }
}
