import { prisma } from '@/lib/db'
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

    const updated = await prisma.order.update({
      where: { id },
      data: {
        archived: archive,
        archivedAt: archive ? new Date() : null,
      },
    })

    return NextResponse.json({
      id: updated.id,
      archived: updated.archived,
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
    const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
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

    // Find stale orders (not delivered, not archived, not updated recently)
    const staleOrders = await prisma.order.findMany({
      where: {
        archived: false,
        deliveryDate: null, // Not delivered
        updatedAt: {
          lt: thresholdDate,
        },
      },
      select: { id: true },
    })

    if (staleOrders.length === 0) {
      return NextResponse.json({ count: 0, message: 'No stale orders found' })
    }

    // Archive all stale orders
    const result = await prisma.order.updateMany({
      where: {
        id: { in: staleOrders.map(o => o.id) },
      },
      data: {
        archived: true,
        archivedAt: new Date(),
      },
    })

    return NextResponse.json({
      count: result.count,
      message: `${result.count} orders archived`,
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

    // Check if archiving is enabled
    const settings = await prisma.settings.findUnique({ where: { id: 'default' } })

    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays)

    // Count stale orders
    const staleCount = await prisma.order.count({
      where: {
        archived: false,
        deliveryDate: null,
        updatedAt: {
          lt: thresholdDate,
        },
      },
    })

    // Count archived orders
    const archivedCount = await prisma.order.count({
      where: { archived: true },
    })

    return NextResponse.json({
      staleCount,
      archivedCount,
      thresholdDays,
      archiveEnabled: settings?.archiveEnabled ?? true,
    })
  } catch (error) {
    console.error('Failed to get stale orders count:', error)
    return NextResponse.json({ error: 'Failed to get stale orders count' }, { status: 500 })
  }
}
