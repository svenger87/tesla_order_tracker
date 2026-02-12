import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

// Admin endpoint to reset an order's editCode (for users who lost their code)
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

    // Reset the editCode to null, allowing user to set a new one via username
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { editCode: null },
      select: { id: true, name: true },
    })

    return NextResponse.json({
      success: true,
      message: `EditCode für "${order.name}" wurde zurückgesetzt. Der Benutzer kann jetzt seinen Benutzernamen verwenden.`,
      orderId: order.id,
    })
  } catch (error) {
    console.error('Reset code failed:', error)
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}
