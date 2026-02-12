import { prisma } from '@/lib/db'
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

    const adminRecord = await prisma.admin.findUnique({ where: { id: admin.adminId } })
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

    await prisma.admin.update({
      where: { id: admin.adminId },
      data: { passwordHash },
    })

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Password reset failed:', error)
    return NextResponse.json({ error: 'Password reset failed' }, { status: 500 })
  }
}
