import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

class MissingSecretError extends Error {}

/**
 * No fallback on purpose: a default secret in a public repository means anyone
 * can mint a valid admin token against an instance that forgot to set this.
 *
 * Resolved per call rather than at module load, because the Docker image is
 * built without runtime secrets — validating at import time would fail the
 * build instead of the misconfigured deployment.
 */
function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new MissingSecretError(
      'JWT_SECRET is not set. Generate one with `openssl rand -base64 32` and put it in the environment.'
    )
  }
  if (secret.length < 32) {
    throw new MissingSecretError(
      `JWT_SECRET is too short (${secret.length} characters). Use at least 32.`
    )
  }
  return secret
}

export interface JWTPayload {
  adminId: string
  username: string
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, requireJwtSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, requireJwtSecret()) as JWTPayload
  } catch (error) {
    // An invalid or expired token is routine and means "not logged in".
    // A missing secret is a deployment fault and must not hide behind that.
    if (error instanceof MissingSecretError) throw error
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
