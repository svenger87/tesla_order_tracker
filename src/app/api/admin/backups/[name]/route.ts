import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { deleteBackup, readOrders } from '@/lib/backup'
import { diffOrders } from '@/lib/backup-diff'
import { isBackupName } from '@/lib/backup-diff'
import { prisma } from '@/lib/db'

// GET /api/admin/backups/<name> — what changed between that snapshot and now
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })

  const { name } = await params
  if (!isBackupName(name)) {
    return NextResponse.json({ error: 'Unknown backup' }, { status: 400 })
  }

  try {
    const before = readOrders(name)
    const after = (await prisma.order.findMany()) as unknown as Record<string, unknown>[]
    return NextResponse.json({ name, diff: diffOrders(before, after) })
  } catch (error) {
    console.error('Failed to compare backup:', error)
    return NextResponse.json({ error: 'Failed to compare backup' }, { status: 500 })
  }
}

// DELETE /api/admin/backups/<name>
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })

  const { name } = await params
  if (!isBackupName(name)) {
    return NextResponse.json({ error: 'Unknown backup' }, { status: 400 })
  }

  try {
    await deleteBackup(name)
    return NextResponse.json({ deleted: name })
  } catch (error) {
    console.error('Failed to delete backup:', error)
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 })
  }
}
