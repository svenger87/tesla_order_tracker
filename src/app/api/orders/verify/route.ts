import { query, queryOne } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const editCode = searchParams.get('editCode')

    if (!editCode) {
      return NextResponse.json({ error: 'Edit code required' }, { status: 400 })
    }

    // First, try to find by editCode (standard flow)
    const order = await queryOne<{ id: string }>(
      `SELECT id FROM "Order" WHERE editCode = ?`,
      [editCode],
    )

    if (order) {
      return NextResponse.json({ orderId: order.id, isLegacy: false })
    }

    // Fallback: For legacy orders (imported without editCode), allow using username
    const searchName = editCode.trim().toLowerCase()

    const allOrders = await query<{ id: string; name: string; editCode: string | null }>(
      `SELECT id, name, editCode FROM "Order"`,
    )

    // Filter for legacy orders (no editCode - null OR empty string) and match by name case-insensitively
    const legacyOrder = allOrders.find(o =>
      (!o.editCode || o.editCode === '') && o.name && o.name.trim().toLowerCase() === searchName
    )

    // Debug logging
    if (!legacyOrder) {
      const legacyCount = allOrders.filter(o => !o.editCode || o.editCode === '').length
      console.log(`[Legacy Verify] No match for "${editCode}" (searched: "${searchName}")`)
      console.log(`[Legacy Verify] Total orders: ${allOrders.length}, Legacy (no editCode): ${legacyCount}`)
      const sampleNames = allOrders
        .filter(o => !o.editCode || o.editCode === '')
        .slice(0, 10)
        .map(o => `"${o.name}"`)
      console.log(`[Legacy Verify] Sample legacy names: ${sampleNames.join(', ')}`)

      const userWithCode = allOrders.find(o =>
        o.name && o.name.trim().toLowerCase() === searchName && o.editCode
      )
      if (userWithCode) {
        console.log(`[Legacy Verify] User "${searchName}" exists but already has an editCode set!`)
      }
    }

    if (legacyOrder) {
      return NextResponse.json({
        orderId: legacyOrder.id,
        isLegacy: true,
        message: 'Bestandseintrag gefunden. Bitte setze ein neues Passwort.',
      })
    }

    return NextResponse.json({ error: 'Ungültiger Code oder Benutzername' }, { status: 404 })
  } catch (error) {
    console.error('Failed to verify edit code:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
