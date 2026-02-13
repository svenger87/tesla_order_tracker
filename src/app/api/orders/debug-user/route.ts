import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Debug endpoint to check if a user exists in the database
// TODO: Remove this endpoint after debugging
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')

    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }

    const searchName = name.trim().toLowerCase()

    const allOrders = await query<{ id: string; name: string; editCode: string | null; orderDate: string | null }>(
      `SELECT id, name, editCode, orderDate FROM "Order"`,
    )

    // Exact match (case-insensitive)
    const exactMatch = allOrders.find(o =>
      o.name && o.name.trim().toLowerCase() === searchName
    )

    // Partial matches
    const partialMatches = allOrders.filter(o =>
      o.name && o.name.toLowerCase().includes(searchName.substring(0, 4))
    ).slice(0, 10)

    return NextResponse.json({
      searchedFor: name,
      normalizedSearch: searchName,
      exactMatch: exactMatch ? {
        id: exactMatch.id,
        name: exactMatch.name,
        hasEditCode: !!exactMatch.editCode,
        editCodePreview: exactMatch.editCode ? `${exactMatch.editCode.substring(0, 4)}...` : null,
        orderDate: exactMatch.orderDate,
      } : null,
      partialMatches: partialMatches.map(o => ({
        name: o.name,
        hasEditCode: !!o.editCode,
      })),
      totalOrders: allOrders.length,
      legacyOrdersCount: allOrders.filter(o => !o.editCode).length,
    })
  } catch (error) {
    console.error('Debug user failed:', error)
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
}
