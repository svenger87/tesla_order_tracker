import { query, queryOne, execute, generateId, nowISO } from '@/lib/db'
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
    const countResult = await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM "Admin"`)
    if (countResult && countResult.count === 0) {
      const passwordHash = await hashPassword(envPassword)
      const now = nowISO()
      await execute(
        `INSERT INTO "Admin" (id, username, passwordHash, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
        [generateId(), envUsername, passwordHash, now, now],
      )
    }

    let admin = await queryOne<{ id: string; username: string; passwordHash: string }>(
      `SELECT id, username, passwordHash FROM "Admin" WHERE username = ?`,
      [username],
    )

    // If login matches env vars but stored hash doesn't match, update the admin
    if (!admin && username === envUsername) {
      const existingAdmin = await queryOne<{ id: string; username: string; passwordHash: string }>(
        `SELECT id, username, passwordHash FROM "Admin" LIMIT 1`,
      )
      if (existingAdmin && existingAdmin.username !== envUsername) {
        const now = nowISO()
        await execute(
          `UPDATE "Admin" SET username = ?, passwordHash = ?, updatedAt = ? WHERE id = ?`,
          [envUsername, await hashPassword(envPassword), now, existingAdmin.id],
        )
        admin = { ...existingAdmin, username: envUsername, passwordHash: await hashPassword(envPassword) }
      }
    }

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check if password matches stored hash
    let valid = await comparePassword(password, admin.passwordHash)

    // If password doesn't match stored hash but matches env var, update the hash
    if (!valid && username === envUsername && password === envPassword) {
      const newHash = await hashPassword(envPassword)
      const now = nowISO()
      await execute(
        `UPDATE "Admin" SET passwordHash = ?, updatedAt = ? WHERE id = ?`,
        [newHash, now, admin.id],
      )
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
