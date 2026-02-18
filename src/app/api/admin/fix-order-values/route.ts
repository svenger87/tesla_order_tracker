import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

// Mapping of bad raw values → correct normalized values per field
const FIXES: Record<string, Record<string, string>> = {
  color: {
    'Pearl White': 'pearl_white',
    'Solid Black': 'solid_black',
    'Diamond Black': 'diamond_black',
    'Stealth Grey': 'stealth_grey',
    'Quicksilver': 'quicksilver',
    'Ultra Red': 'ultra_red',
    'Glacier Blue': 'glacier_blue',
    'Marine Blue': 'marine_blue',
    'Deep Blue Metallic': 'deep_blue',
    'Midnight Cherry Red': 'midnight_cherry',
  },
  interior: {
    'Schwarz': 'black',
    'Weiß': 'white',
    'Black': 'black',
    'White': 'white',
  },
  autopilot: {
    'Kein': 'none',
    'FSD': 'fsd',
    'EAP': 'eap',
    'AP': 'ap',
    'FSD Transfer': 'fsd_transfer',
    'EAP Transfer': 'eap_transfer',
  },
  towHitch: {
    'Ja': 'ja',
    'Nein': 'nein',
    'n.v.': 'nv',
    '-': 'nv',
  },
  country: {
    '🇦🇹 Österreich': 'at',
    '🇩🇪 Deutschland': 'de',
    '🇨🇭 Schweiz': 'ch',
    'Österreich': 'at',
    'Deutschland': 'de',
    'Schweiz': 'ch',
  },
}

// POST - Fix order values that were stored as display labels instead of normalized values
export async function POST(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  try {
    const results: { id: string; name: string; field: string; old: string; new: string }[] = []

    const orders = await prisma.order.findMany()

    for (const order of orders) {
      const updates: Record<string, string> = {}

      for (const [field, mapping] of Object.entries(FIXES)) {
        const currentValue = (order as Record<string, unknown>)[field] as string | null
        if (!currentValue) continue

        const fix = mapping[currentValue]
        if (fix) {
          updates[field] = fix
          results.push({
            id: order.id,
            name: order.name,
            field,
            old: currentValue,
            new: fix,
          })
        }
      }

      if (Object.keys(updates).length > 0) {
        await prisma.order.update({
          where: { id: order.id },
          data: updates,
        })
      }
    }

    return NextResponse.json({
      success: true,
      fixed: results.length,
      details: results,
    })
  } catch (error) {
    console.error('Failed to fix order values:', error)
    return NextResponse.json({ error: 'Failed to fix order values' }, { status: 500 })
  }
}
