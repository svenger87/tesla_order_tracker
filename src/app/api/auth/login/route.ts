import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { comparePassword, signToken, hashPassword } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    const envUsername = process.env.ADMIN_USERNAME
    const envPassword = process.env.ADMIN_PASSWORD

    if (!envUsername || !envPassword) {
      console.error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Check if any admin exists, if not, create from env vars
    const adminCount = await prisma.admin.count()
    if (adminCount === 0) {
      const passwordHash = await hashPassword(envPassword)
      await prisma.admin.create({
        data: {
          username: envUsername,
          passwordHash,
        },
      })
    }

    let admin = await prisma.admin.findUnique({ where: { username } })

    // If login matches env vars but stored hash doesn't match, update the admin
    // This allows password changes via env vars to take effect
    if (!admin && username === envUsername) {
      // Username matches env but doesn't exist - check if we need to update existing admin
      const existingAdmin = await prisma.admin.findFirst()
      if (existingAdmin && existingAdmin.username !== envUsername) {
        // Admin exists with different username, update it
        admin = await prisma.admin.update({
          where: { id: existingAdmin.id },
          data: {
            username: envUsername,
            passwordHash: await hashPassword(envPassword),
          },
        })
      }
    }

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check if password matches stored hash
    let valid = await comparePassword(password, admin.passwordHash)

    // If password doesn't match stored hash but matches env var, update the hash
    // This handles the case where env var password was changed
    if (!valid && username === envUsername && password === envPassword) {
      const newHash = await hashPassword(envPassword)
      admin = await prisma.admin.update({
        where: { id: admin.id },
        data: { passwordHash: newHash },
      })
      valid = true
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = signToken({ adminId: admin.id, username: admin.username })

    const cookieStore = await cookies()
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return NextResponse.json({ message: 'Login successful', username: admin.username })
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
