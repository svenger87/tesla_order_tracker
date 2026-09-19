/**
 * What an API key may do. Stored on ApiKey.scopes as a comma list, so the
 * order here is the canonical order everything is written back in.
 */
export const API_SCOPES = ['orders:read', 'orders:read:pii', 'orders:write', 'options:read', 'tost'] as const

export type ApiScope = (typeof API_SCOPES)[number]

export function isApiScope(s: string): s is ApiScope {
  return (API_SCOPES as readonly string[]).includes(s)
}

/** Unknown entries are dropped rather than trusted — a stale value must not grant anything. */
export function parseScopes(stored: string): ApiScope[] {
  return stored.split(',').map(s => s.trim()).filter(isApiScope)
}

export function serializeScopes(scopes: readonly ApiScope[]): string {
  return API_SCOPES.filter(s => scopes.includes(s)).join(',')
}

export interface ApiKeyInput {
  name?: string
  contact?: string | null
  scopes?: ApiScope[]
  ratePerMinute?: number
  quotaPerDay?: number
}

const LIMITS = {
  ratePerMinute: { max: 10_000 },
  quotaPerDay: { max: 1_000_000 },
} as const

/** Validates an admin create/update body. `create` requires name and scopes. */
export function parseApiKeyInput(
  body: unknown,
  mode: 'create' | 'update',
): { ok: true; value: ApiKeyInput } | { ok: false; errors: Record<string, string> } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, errors: { body: 'Expected a JSON object' } }
  }
  const b = body as Record<string, unknown>
  const errors: Record<string, string> = {}
  const value: ApiKeyInput = {}

  if (b.name !== undefined) {
    const name = typeof b.name === 'string' ? b.name.trim() : ''
    if (!name || name.length > 100) errors.name = 'Name must be 1–100 characters'
    else value.name = name
  } else if (mode === 'create') {
    errors.name = 'Name is required'
  }

  if (b.contact !== undefined) {
    if (b.contact === null) value.contact = null
    else if (typeof b.contact !== 'string' || b.contact.length > 200) errors.contact = 'Contact must be at most 200 characters'
    else value.contact = b.contact.trim() || null
  }

  if (b.scopes !== undefined) {
    if (!Array.isArray(b.scopes) || b.scopes.length === 0 || !b.scopes.every(s => typeof s === 'string')) {
      errors.scopes = 'Scopes must be a non-empty list'
    } else {
      const unknown = (b.scopes as string[]).filter(s => !isApiScope(s))
      const scopes = parseScopes((b.scopes as string[]).filter(isApiScope).join(','))
      if (unknown.length) errors.scopes = `Unknown scopes: ${unknown.join(', ')}`
      else if (scopes.includes('orders:read:pii') && !scopes.includes('orders:read')) {
        errors.scopes = 'orders:read:pii requires orders:read'
      } else value.scopes = API_SCOPES.filter(s => scopes.includes(s))
    }
  } else if (mode === 'create') {
    errors.scopes = 'Scopes are required'
  }

  for (const field of ['ratePerMinute', 'quotaPerDay'] as const) {
    if (b[field] === undefined) continue
    const n = b[field]
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > LIMITS[field].max) {
      errors[field] = `${field} must be a whole number from 1 to ${LIMITS[field].max}`
    } else value[field] = n
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value }
}
