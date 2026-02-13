import { prisma } from '@/lib/db'
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
    const resetCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        resetCode,
        resetCodeExpires,
      },
      select: { id: true, name: true },
    })

    return NextResponse.json({
      success: true,
      resetCode,
      expiresAt: resetCodeExpires.toISOString(),
      message: `Einmalcode für "${order.name}" generiert. Gültig für 24 Stunden.`,
      orderId: order.id,
    })
  } catch (error) {
    console.error('Generate reset code failed:', error)
    return NextResponse.json({ error: 'Generate reset code failed' }, { status: 500 })
  }
}
