import { queryOne, execute, nowISO } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import crypto from 'crypto'

// Generate a random 6-digit code
function generateResetCode(): string {
  return crypto.randomInt(100000, 999999).toString()
}

// Admin endpoint to generate a one-time reset code for an order
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    // Generate a 6-digit code valid for 24 hours
    const resetCode = generateResetCode()
    const resetCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    await execute(
      `UPDATE "Order" SET resetCode = ?, resetCodeExpires = ?, updatedAt = ? WHERE id = ?`,
      [resetCode, resetCodeExpires, nowISO(), orderId],
    )

    const order = await queryOne<{ id: string; name: string }>(
      `SELECT id, name FROM "Order" WHERE id = ?`,
      [orderId],
    )

    return NextResponse.json({
      success: true,
      resetCode,
      expiresAt: resetCodeExpires,
      message: `Einmalcode für "${order?.name}" generiert. Gültig für 24 Stunden.`,
      orderId,
    })
  } catch (error) {
    console.error('Generate reset code failed:', error)
    return NextResponse.json({ error: 'Generate reset code failed' }, { status: 500 })
  }
}
