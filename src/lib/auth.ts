import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production'

export interface JWTPayload {
  adminId: string
  username: string
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function getAdminFromCookie(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export function generateResetToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
