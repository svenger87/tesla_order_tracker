import { query, execute, generateId, nowISO } from '@/lib/db'
import { transformOptionRow } from '@/lib/db-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

const VALID_TYPES = ['country', 'model', 'range', 'drive', 'color', 'interior', 'wheels', 'autopilot', 'towHitch', 'deliveryLocation'] as const
const VALID_VEHICLE_TYPES = ['Model Y', 'Model 3'] as const
type OptionType = typeof VALID_TYPES[number]

function isValidType(type: string): type is OptionType {
  return VALID_TYPES.includes(type as OptionType)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const vehicleType = searchParams.get('vehicleType')

    let sql = `SELECT id, type, value, label, vehicleType, metadata, sortOrder FROM "Option" WHERE isActive = 1`
    const args: unknown[] = []

    if (type && isValidType(type)) {
      sql += ` AND type = ?`
      args.push(type)
    }

    if (vehicleType) {
      sql += ` AND (vehicleType IS NULL OR vehicleType = ?)`
      args.push(vehicleType)
    }

    sql += ` ORDER BY type ASC, sortOrder ASC, label ASC`

    const rows = await query<Record<string, unknown>>(sql, args)
    const options = rows.map(row => {
      const opt = transformOptionRow(row)
      return {
        ...opt,
        metadata: opt.metadata ? JSON.parse(opt.metadata) : null,
      }
    })

    // Sort countries alphabetically with German locale
    const sortedOptions = options.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type)
      if (a.type === 'country') {
        return a.label.localeCompare(b.label, 'de', { sensitivity: 'base' })
      }
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.label.localeCompare(b.label)
    })

    return NextResponse.json(sortedOptions)
  } catch (error) {
    console.error('Failed to fetch options:', error)
    return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { type, value, label, vehicleType, metadata, sortOrder } = body

    if (!type || !value || !label) {
      return NextResponse.json({ error: 'type, value, and label are required' }, { status: 400 })
    }

    if (!isValidType(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }

    if (vehicleType && !VALID_VEHICLE_TYPES.includes(vehicleType)) {
      return NextResponse.json({ error: `Invalid vehicleType. Must be one of: ${VALID_VEHICLE_TYPES.join(', ')}` }, { status: 400 })
    }

    const id = generateId()
    const now = nowISO()
    await execute(
      `INSERT INTO "Option" (id, type, value, label, vehicleType, metadata, sortOrder, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, type, value, label, vehicleType || null, metadata ? JSON.stringify(metadata) : null, sortOrder ?? 0, now, now],
    )

    return NextResponse.json({
      id, type, value, label, vehicleType: vehicleType || null,
      metadata: metadata || null, sortOrder: sortOrder ?? 0, isActive: true,
      createdAt: now, updatedAt: now,
    })
  } catch (error) {
    console.error('Failed to create option:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    if (errorMsg.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'Diese Option existiert bereits' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create option' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { id, label, vehicleType, metadata, sortOrder, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    if (vehicleType !== undefined && vehicleType !== null && !VALID_VEHICLE_TYPES.includes(vehicleType)) {
      return NextResponse.json({ error: `Invalid vehicleType. Must be one of: ${VALID_VEHICLE_TYPES.join(', ')}` }, { status: 400 })
    }

    const setClauses: string[] = ['updatedAt = ?']
    const args: unknown[] = [nowISO()]

    if (label !== undefined) { setClauses.push('label = ?'); args.push(label) }
    if (vehicleType !== undefined) { setClauses.push('vehicleType = ?'); args.push(vehicleType || null) }
    if (metadata !== undefined) { setClauses.push('metadata = ?'); args.push(metadata ? JSON.stringify(metadata) : null) }
    if (sortOrder !== undefined) { setClauses.push('sortOrder = ?'); args.push(sortOrder) }
    if (isActive !== undefined) { setClauses.push('isActive = ?'); args.push(isActive ? 1 : 0) }

    args.push(id)
    await execute(`UPDATE "Option" SET ${setClauses.join(', ')} WHERE id = ?`, args)

    const row = await query<Record<string, unknown>>(`SELECT * FROM "Option" WHERE id = ?`, [id])
    const option = row[0] ? transformOptionRow(row[0]) : null

    return NextResponse.json(option ? {
      ...option,
      metadata: option.metadata ? JSON.parse(option.metadata) : null,
    } : null)
  } catch (error) {
    console.error('Failed to update option:', error)
    return NextResponse.json({ error: 'Failed to update option' }, { status: 500 })
  }
}

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

    await execute(`UPDATE "Option" SET isActive = 0, updatedAt = ? WHERE id = ?`, [nowISO(), id])

    return NextResponse.json({ message: 'Option deactivated' })
  } catch (error) {
    console.error('Failed to delete option:', error)
    return NextResponse.json({ error: 'Failed to delete option' }, { status: 500 })
  }
}
