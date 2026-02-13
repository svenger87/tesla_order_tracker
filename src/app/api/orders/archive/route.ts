import { query, queryOne, execute, nowISO } from '@/lib/db'
import { transformSettingsRow } from '@/lib/db-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

// Archive or unarchive a single order
export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { id, archive } = body

    if (!id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    const now = nowISO()
    await execute(
      `UPDATE "Order" SET archived = ?, archivedAt = ?, updatedAt = ? WHERE id = ?`,
      [archive ? 1 : 0, archive ? now : null, now, id],
    )

    return NextResponse.json({
      id,
      archived: archive,
      message: archive ? 'Order archived' : 'Order restored',
    })
  } catch (error) {
    console.error('Failed to archive order:', error)
    return NextResponse.json({ error: 'Failed to archive order' }, { status: 500 })
  }
}

// Batch archive stale orders
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    // Check if archiving is enabled
    const settingsRow = await queryOne<Record<string, unknown>>(`SELECT * FROM "Settings" WHERE id = ?`, ['default'])
    const settings = settingsRow ? transformSettingsRow(settingsRow) : null
    if (!settings?.archiveEnabled) {
      return NextResponse.json({ error: 'Archivierung ist deaktiviert' }, { status: 400 })
    }

    const body = await request.json()
    const { thresholdDays } = body

    if (!thresholdDays || thresholdDays < 1) {
      return NextResponse.json({ error: 'Invalid threshold' }, { status: 400 })
    }

    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays)
    const thresholdISO = thresholdDate.toISOString()

    // Find stale orders
    const staleOrders = await query<{ id: string }>(
      `SELECT id FROM "Order" WHERE archived = 0 AND deliveryDate IS NULL AND updatedAt < ?`,
      [thresholdISO],
    )

    if (staleOrders.length === 0) {
      return NextResponse.json({ count: 0, message: 'No stale orders found' })
    }

    // Archive all stale orders
    const now = nowISO()
    const placeholders = staleOrders.map(() => '?').join(',')
    const ids = staleOrders.map(o => o.id)
    await execute(
      `UPDATE "Order" SET archived = 1, archivedAt = ?, updatedAt = ? WHERE id IN (${placeholders})`,
      [now, now, ...ids],
    )

    return NextResponse.json({
      count: staleOrders.length,
      message: `${staleOrders.length} orders archived`,
    })
  } catch (error) {
    console.error('Failed to batch archive orders:', error)
    return NextResponse.json({ error: 'Failed to batch archive orders' }, { status: 500 })
  }
}

// Get stale orders count (for preview)
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const thresholdDays = parseInt(searchParams.get('thresholdDays') || '180')

    if (isNaN(thresholdDays) || thresholdDays < 1) {
      return NextResponse.json({ error: 'Invalid threshold' }, { status: 400 })
    }

    const settingsRow = await queryOne<Record<string, unknown>>(`SELECT * FROM "Settings" WHERE id = ?`, ['default'])
    const settings = settingsRow ? transformSettingsRow(settingsRow) : null

    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays)
    const thresholdISO = thresholdDate.toISOString()

    const staleResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM "Order" WHERE archived = 0 AND deliveryDate IS NULL AND updatedAt < ?`,
      [thresholdISO],
    )

    const archivedResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM "Order" WHERE archived = 1`,
    )

    return NextResponse.json({
      staleCount: staleResult?.count ?? 0,
      archivedCount: archivedResult?.count ?? 0,
      thresholdDays,
      archiveEnabled: settings?.archiveEnabled ?? true,
    })
  } catch (error) {
    console.error('Failed to get stale orders count:', error)
    return NextResponse.json({ error: 'Failed to get stale orders count' }, { status: 500 })
  }
}
