import { NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { createBackup, listBackups, pruneBackups } from '@/lib/backup'

/** How many snapshots are kept. Older ones are removed when a new one is taken. */
const KEEP = 20

// GET /api/admin/backups — list the snapshots on disk (admin only)
export async function GET() {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })

  try {
    return NextResponse.json({ backups: await listBackups(), keep: KEEP })
  } catch (error) {
    console.error('Failed to list backups:', error)
    return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 })
  }
}

// POST /api/admin/backups — take a snapshot now (admin only)
export async function POST() {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })

  try {
    const backup = await createBackup()
    // Pruned after the new one exists and verified, never before: a failed
    // backup must not also cost the oldest good one.
    const pruned = await pruneBackups(KEEP)
    return NextResponse.json({ backup, pruned })
  } catch (error) {
    console.error('Failed to create backup:', error)
    const message = error instanceof Error ? error.message : 'Failed to create backup'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
