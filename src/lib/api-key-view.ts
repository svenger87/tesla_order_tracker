import type { ApiKey } from '@/generated/prisma/client'
import { parseScopes } from './api-scopes'

/** An ApiKey row as the admin UI sees it. Never includes the hash. */
export function toKeyView(key: ApiKey, requestsToday = 0) {
  return {
    id: key.id,
    name: key.name,
    contact: key.contact,
    keyPrefix: key.keyPrefix,
    scopes: parseScopes(key.scopes),
    ratePerMinute: key.ratePerMinute,
    quotaPerDay: key.quotaPerDay,
    revokedAt: key.revokedAt?.toISOString() ?? null,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    requestsToday,
  }
}
