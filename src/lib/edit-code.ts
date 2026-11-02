import bcrypt from 'bcryptjs'
import { secretsMatch } from './secrets'

/** The rules the order form enforces; null when the code is acceptable. */
export function editCodeError(code: string): string | null {
  if (code.length < 6) return 'Password must be at least 6 characters'
  if (!/\d/.test(code)) return 'Password must contain at least one number'
  return null
}

/** Same cost the web form has always used, so both kinds of order verify alike. */
export function hashEditCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10)
}

/**
 * Bcrypt-aware: codes written before hashing (sheet imports, the v1 API until
 * it hashed too) are plain text and still have to open their order.
 */
export async function editCodeMatches(input: string, stored: string | null): Promise<boolean> {
  if (!stored || !input) return false
  if (stored.startsWith('$2')) return bcrypt.compare(input, stored)
  return secretsMatch(input, stored)
}
