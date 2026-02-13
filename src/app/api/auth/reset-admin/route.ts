import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'

// POST /api/auth/reset-admin?token=YOUR_RESET_TOKEN
// This endpoint resets the admin credentials from environment variables
// Requires ADMIN_RESET_TOKEN env var to be set and passed as query param
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    const resetToken = process.env.ADMIN_RESET_TOKEN

    if (!resetToken) {
      return NextResponse.json(
        { error: 'ADMIN_RESET_TOKEN not configured' },
        { status: 500 }
      )
    }

    if (!token || token !== resetToken) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 401 }
      )
    }

    const envUsername = process.env.ADMIN_USERNAME
    const envPassword = process.env.ADMIN_PASSWORD

    if (!envUsername || !envPassword) {
      return NextResponse.json(
        { error: 'ADMIN_USERNAME and ADMIN_PASSWORD must be configured' },
        { status: 500 }
      )
    }

    // Delete all existing admins
    await prisma.admin.deleteMany()

    // Create new admin from env vars
    const passwordHash = await hashPassword(envPassword)
    const admin = await prisma.admin.create({
      data: {
        username: envUsername,
        passwordHash,
      },
    })

    return NextResponse.json({
      message: 'Admin reset successful',
      username: admin.username,
    })
  } catch (error) {
    console.error('Admin reset failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: 'Admin reset failed',
      details: errorMessage,
      tursoConfigured: !!process.env.TURSO_DATABASE_URL,
    }, { status: 500 })
  }
}

// GET endpoint disabled for security - no info disclosure
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
