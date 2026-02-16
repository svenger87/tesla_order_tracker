import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

// GET - Public: returns all active codes as structured map, or raw records with ?raw=true
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const raw = searchParams.get('raw') === 'true'

    const codes = await prisma.compositorCode.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { vehicleType: 'asc' }, { sortOrder: 'asc' }],
    })

    // Raw mode: return full records (used by admin editor)
    if (raw) {
      return NextResponse.json(codes)
    }

    // Public mode: return structured map for compositor
    const map: Record<string, Record<string, Record<string, { code: string; label: string | null }>>> = {}

    for (const c of codes) {
      if (!map[c.category]) map[c.category] = {}
      if (!map[c.category][c.vehicleType]) map[c.category][c.vehicleType] = {}
      map[c.category][c.vehicleType][c.lookupKey] = { code: c.code, label: c.label }
    }

    return NextResponse.json(map, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (error) {
    console.error('Failed to fetch compositor codes:', error)
    return NextResponse.json({ error: 'Failed to fetch compositor codes' }, { status: 500 })
  }
}

// POST - Admin: create a new code
export async function POST(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { category, vehicleType, lookupKey, code, label, sortOrder } = body

    if (!category || !vehicleType || !lookupKey || !code) {
      return NextResponse.json({ error: 'Missing required fields: category, vehicleType, lookupKey, code' }, { status: 400 })
    }

    const created = await prisma.compositorCode.create({
      data: {
        category,
        vehicleType,
        lookupKey,
        code,
        label: label || null,
        sortOrder: sortOrder ?? 0,
        isActive: true,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Failed to create compositor code:', error)
    const message = error instanceof Error && error.message.includes('Unique constraint')
      ? 'Code with this category/vehicleType/lookupKey already exists'
      : 'Failed to create compositor code'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT - Admin: update a code
export async function PUT(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, code, label, sortOrder, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const updated = await prisma.compositorCode.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(label !== undefined && { label }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update compositor code:', error)
    return NextResponse.json({ error: 'Failed to update compositor code' }, { status: 500 })
  }
}

// DELETE - Admin: deactivate a code
export async function DELETE(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    const updated = await prisma.compositorCode.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to deactivate compositor code:', error)
    return NextResponse.json({ error: 'Failed to deactivate compositor code' }, { status: 500 })
  }
}
