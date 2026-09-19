import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { invalidateKeyCache } from '@/lib/api-consumers'
import { parseApiKeyInput, serializeScopes } from '@/lib/api-scopes'
import { toKeyView } from '@/lib/api-key-view'

interface Context {
  params: Promise<{ id: string }>
}

// PATCH /api/admin/api-keys/[id] — change name, contact, scopes or limits (admin only)
export async function PATCH(request: NextRequest, context: Context) {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })

  const { id } = await context.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Validation failed', details: { body: 'Invalid JSON' } }, { status: 400 })
  }
  const parsed = parseApiKeyInput(body, 'update')
  if (!parsed.ok) return NextResponse.json({ error: 'Validation failed', details: parsed.errors }, { status: 400 })

  try {
    const existing = await prisma.apiKey.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    if (existing.revokedAt) return NextResponse.json({ error: 'API key is revoked' }, { status: 409 })

    const { scopes, ...rest } = parsed.value
    const key = await prisma.apiKey.update({
      where: { id },
      data: { ...rest, ...(scopes && { scopes: serializeScopes(scopes) }) },
    })
    invalidateKeyCache()
    return NextResponse.json({ key: toKeyView(key) })
  } catch (error) {
    console.error('Failed to update API key:', error)
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
  }
}

// DELETE /api/admin/api-keys/[id] — revoke; the row and its usage history stay (admin only)
export async function DELETE(_request: NextRequest, context: Context) {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })

  const { id } = await context.params
  try {
    const existing = await prisma.apiKey.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'API key not found' }, { status: 404 })

    const key = existing.revokedAt
      ? existing
      : await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } })
    invalidateKeyCache()
    return NextResponse.json({ key: toKeyView(key) })
  } catch (error) {
    console.error('Failed to revoke API key:', error)
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }
}
