import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { checkRateLimit, clientKey } from '@/lib/rate-limit'

// A 6-digit code is only 900k possibilities — without a limit it is guessable
// in minutes, which would hand over the order it was issued for.
const RESET_CODE_RULE = { limit: 5, windowMs: 15 * 60 * 1000 }

// User endpoint to use a one-time reset code and set a new password
export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(clientKey(request, 'use-reset-code'), RESET_CODE_RULE)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Zu viele Versuche. Bitte später erneut versuchen.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    const { resetCode, newPassword } = await request.json()

    if (!resetCode) {
      return NextResponse.json({ error: 'Einmalcode erforderlich', code: 'RESET_CODE_REQUIRED' }, { status: 400 })
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen lang sein', code: 'PASSWORD_TOO_SHORT' }, { status: 400 })
    }

    // Check if password contains at least one number
    if (!/\d/.test(newPassword)) {
      return NextResponse.json({ error: 'Passwort muss mindestens eine Zahl enthalten', code: 'PASSWORD_NEEDS_DIGIT' }, { status: 400 })
    }

    // Find order with this reset code
    const order = await prisma.order.findFirst({
      where: {
        resetCode: resetCode.trim(),
        resetCodeExpires: {
          gt: new Date(), // Not expired
        },
      },
      select: { id: true, name: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Ungültiger oder abgelaufener Einmalcode', code: 'RESET_CODE_INVALID' }, { status: 400 })
    }

    // Hash the new password
    const newEditCode = await bcrypt.hash(newPassword, 10)

    // Update the order with new editCode and clear reset code
    await prisma.order.update({
      where: { id: order.id },
      data: {
        editCode: newEditCode,
        resetCode: null,
        resetCodeExpires: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Passwort für "${order.name}" wurde erfolgreich geändert. Du kannst dich jetzt mit deinem neuen Passwort anmelden.`,
    })
  } catch (error) {
    console.error('Use reset code failed:', error)
    return NextResponse.json({ error: 'Passwort-Reset fehlgeschlagen', code: 'SERVER_ERROR' }, { status: 500 })
  }
}
