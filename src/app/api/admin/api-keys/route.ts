import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BUILTIN_CONSUMERS, envKeys, generateApiKey, invalidateKeyCache } from '@/lib/api-consumers'
import { parseApiKeyInput, serializeScopes } from '@/lib/api-scopes'
import { requestsTodayByConsumer } from '@/lib/api-key-store'
import { toKeyView } from '@/lib/api-key-view'
import { utcDay } from '@/lib/api-usage'

// GET /api/admin/api-keys — built-in consumers and issued keys (admin only)
export async function GET() {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })

  try {
    const [keys, today] = await Promise.all([
      prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' } }),
      requestsTodayByConsumer(utcDay(Date.now())),
    ])
    const env = envKeys()
    const builtins = [
      { consumer: BUILTIN_CONSUMERS.tost, envVar: 'TOST_API_KEY' as const, configured: !!env.tost },
      { consumer: BUILTIN_CONSUMERS.external, envVar: 'EXTERNAL_API_KEY' as const, configured: !!env.external },
    ].map(({ consumer, envVar, configured }) => ({
      id: consumer.id,
      name: consumer.name,
      envVar,
      configured,
      scopes: consumer.scopes,
      requestsToday: today.get(consumer.id) ?? 0,
    }))

    return NextResponse.json({ builtins, keys: keys.map(k => toKeyView(k, today.get(k.id) ?? 0)) })
  } catch (error) {
    console.error('Failed to list API keys:', error)
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 })
  }
}

// POST /api/admin/api-keys — issue a key; the secret is returned this once (admin only)
export async function POST(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Validation failed', details: { body: 'Invalid JSON' } }, { status: 400 })
  }
  const parsed = parseApiKeyInput(body, 'create')
  if (!parsed.ok) return NextResponse.json({ error: 'Validation failed', details: parsed.errors }, { status: 400 })

  try {
    const { secret, hash, prefix } = generateApiKey()
    const { name, contact, scopes, ratePerMinute, quotaPerDay } = parsed.value
    const key = await prisma.apiKey.create({
      data: {
        name: name!,
        contact: contact ?? null,
        scopes: serializeScopes(scopes!),
        keyHash: hash,
        keyPrefix: prefix,
        ...(ratePerMinute !== undefined && { ratePerMinute }),
        ...(quotaPerDay !== undefined && { quotaPerDay }),
      },
    })
    invalidateKeyCache()
    return NextResponse.json({ key: toKeyView(key), secret }, { status: 201 })
  } catch (error) {
    console.error('Failed to create API key:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}
