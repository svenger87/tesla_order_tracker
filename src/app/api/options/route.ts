import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

// Valid option types
const VALID_TYPES = ['country', 'model', 'drive', 'color', 'interior', 'wheels', 'autopilot', 'towHitch', 'deliveryLocation'] as const
type OptionType = typeof VALID_TYPES[number]

function isValidType(type: string): type is OptionType {
  return VALID_TYPES.includes(type as OptionType)
}

// GET - List all options (public, for form dropdowns)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const where = {
      isActive: true,
      ...(type && isValidType(type) ? { type } : {}),
    }

    const options = await prisma.option.findMany({
      where,
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
      select: {
        id: true,
        type: true,
        value: true,
        label: true,
        metadata: true,
        sortOrder: true,
      },
    })

    // Parse metadata JSON for each option
    const parsedOptions = options.map(opt => ({
      ...opt,
      metadata: opt.metadata ? JSON.parse(opt.metadata) : null,
    }))

    // Sort countries alphabetically with German locale for proper umlaut handling
    const sortedOptions = parsedOptions.sort((a, b) => {
      // First sort by type
      if (a.type !== b.type) return a.type.localeCompare(b.type)
      // For countries, use German locale for proper umlaut sorting
      if (a.type === 'country') {
        return a.label.localeCompare(b.label, 'de', { sensitivity: 'base' })
      }
      // For other types, sort by sortOrder then label
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.label.localeCompare(b.label)
    })

    return NextResponse.json(sortedOptions)
  } catch (error) {
    console.error('Failed to fetch options:', error)
    return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 })
  }
}

// POST - Create new option (admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { type, value, label, metadata, sortOrder } = body

    if (!type || !value || !label) {
      return NextResponse.json({ error: 'type, value, and label are required' }, { status: 400 })
    }

    if (!isValidType(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }

    const option = await prisma.option.create({
      data: {
        type,
        value,
        label,
        metadata: metadata ? JSON.stringify(metadata) : null,
        sortOrder: sortOrder ?? 0,
      },
    })

    return NextResponse.json({
      ...option,
      metadata: option.metadata ? JSON.parse(option.metadata) : null,
    })
  } catch (error) {
    console.error('Failed to create option:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    if (errorMsg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Diese Option existiert bereits' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create option' }, { status: 500 })
  }
}

// PUT - Update option (admin only)
export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { id, label, metadata, sortOrder, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const option = await prisma.option.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(metadata !== undefined && { metadata: metadata ? JSON.stringify(metadata) : null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({
      ...option,
      metadata: option.metadata ? JSON.parse(option.metadata) : null,
    })
  } catch (error) {
    console.error('Failed to update option:', error)
    return NextResponse.json({ error: 'Failed to update option' }, { status: 500 })
  }
}

// DELETE - Delete option (admin only) - actually just deactivates
export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Soft delete by deactivating
    await prisma.option.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Option deactivated' })
  } catch (error) {
    console.error('Failed to delete option:', error)
    return NextResponse.json({ error: 'Failed to delete option' }, { status: 500 })
  }
}
