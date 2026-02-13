import { queryOne, execute, nowISO } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, getAdminFromCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
    }

    const adminRecord = await queryOne<{ id: string; passwordHash: string }>(
      `SELECT id, passwordHash FROM "Admin" WHERE id = ?`,
      [admin.adminId],
    )
    if (!adminRecord) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Verify current password
    const bcrypt = await import('bcryptjs')
    const valid = await bcrypt.compare(currentPassword, adminRecord.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    const passwordHash = await hashPassword(newPassword)

    await execute(
      `UPDATE "Admin" SET passwordHash = ?, updatedAt = ? WHERE id = ?`,
      [passwordHash, nowISO(), admin.adminId],
    )

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Password reset failed:', error)
    return NextResponse.json({ error: 'Password reset failed' }, { status: 500 })
  }
}
