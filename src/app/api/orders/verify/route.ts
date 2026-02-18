import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// Bcrypt-aware password comparison
async function comparePassword(input: string, stored: string): Promise<boolean> {
  if (stored.startsWith('$2')) {
    return bcrypt.compare(input, stored)
  }
  return input === stored
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const editCode = searchParams.get('editCode')
    const orderId = searchParams.get('orderId')
    const checkOnly = searchParams.get('checkOnly') === 'true'

    // Lightweight auth-type check: returns whether order has a password or is legacy
    if (checkOnly && orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, editCode: true },
      })

      if (!order) {
        return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 })
      }

      const hasPassword = !!(order.editCode && order.editCode !== '')
      return NextResponse.json({ hasPassword })
    }

    if (!editCode) {
      return NextResponse.json({ error: 'Edit code required' }, { status: 400 })
    }

    // Per-order verification: look up specific order and compare password
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, name: true, editCode: true },
      })

      if (!order) {
        return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 })
      }

      // Legacy order (no editCode) — match by username
      if (!order.editCode || order.editCode === '') {
        const inputLower = editCode.trim().toLowerCase()
        const nameLower = (order.name || '').trim().toLowerCase()
        if (inputLower === nameLower) {
          return NextResponse.json({
            orderId: order.id,
            isLegacy: true,
            message: 'Bestandseintrag gefunden. Bitte setze ein neues Passwort.',
          })
        }
        return NextResponse.json({ error: 'Ungültiges Passwort oder Benutzername' }, { status: 401 })
      }

      // Compare password (bcrypt-aware)
      const match = await comparePassword(editCode, order.editCode)
      if (match) {
        return NextResponse.json({ orderId: order.id, isLegacy: false })
      }

      return NextResponse.json({ error: 'Ungültiges Passwort' }, { status: 401 })
    }

    // Legacy flow (no orderId): search by editCode directly (plain-text match via DB unique index)
    const order = await prisma.order.findUnique({
      where: { editCode },
      select: { id: true },
    })

    if (order) {
      return NextResponse.json({ orderId: order.id, isLegacy: false })
    }

    // Fallback: For legacy orders (imported without editCode), allow using username
    const searchName = editCode.trim().toLowerCase()

    const allOrders = await prisma.order.findMany({
      select: { id: true, name: true, editCode: true },
    })

    const legacyOrder = allOrders.find(o =>
      (!o.editCode || o.editCode === '') && o.name && o.name.trim().toLowerCase() === searchName
    )

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
