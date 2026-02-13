import { queryOne, execute, nowISO } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// User endpoint to use a one-time reset code and set a new password
export async function POST(request: NextRequest) {
  try {
    const { resetCode, newPassword } = await request.json()

    if (!resetCode) {
      return NextResponse.json({ error: 'Einmalcode erforderlich' }, { status: 400 })
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' }, { status: 400 })
    }

    if (!/\d/.test(newPassword)) {
      return NextResponse.json({ error: 'Passwort muss mindestens eine Zahl enthalten' }, { status: 400 })
    }

    // Find order with this reset code that hasn't expired
    const now = new Date().toISOString()
    const order = await queryOne<{ id: string; name: string }>(
      `SELECT id, name FROM "Order" WHERE resetCode = ? AND resetCodeExpires > ?`,
      [resetCode.trim(), now],
    )

    if (!order) {
      return NextResponse.json({ error: 'Ungültiger oder abgelaufener Einmalcode' }, { status: 400 })
    }

    // Hash the new password
    const newEditCode = await bcrypt.hash(newPassword, 10)

    // Update the order with new editCode and clear reset code
    await execute(
      `UPDATE "Order" SET editCode = ?, resetCode = NULL, resetCodeExpires = NULL, updatedAt = ? WHERE id = ?`,
      [newEditCode, nowISO(), order.id],
    )

    return NextResponse.json({
      success: true,
      message: `Passwort für "${order.name}" wurde erfolgreich geändert. Du kannst dich jetzt mit deinem neuen Passwort anmelden.`,
    })
  } catch (error) {
    console.error('Use reset code failed:', error)
    return NextResponse.json({ error: 'Passwort-Reset fehlgeschlagen' }, { status: 500 })
  }
}
