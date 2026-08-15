import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { readOrder } from '@/lib/backup'
import { COMPARED_FIELDS, isBackupName } from '@/lib/backup-diff'
import { prisma } from '@/lib/db'
import { recordOrderChanges } from '@/lib/order-history'

/**
 * Put one order back the way a snapshot has it.
 *
 * One order, named by id — never "everything since". A restore that replaces
 * the whole table would undo every unrelated edit made in between, which is a
 * bigger and less reversible action than whatever went wrong.
 *
 * What comes back is the order's data. The edit code does not: it is the
 * owner's password, they may have changed it since the snapshot, and restoring
 * the old hash would either lock them out or hand back a password they had
 * replaced. An order that is gone entirely is the exception — it is recreated
 * with its credential, because otherwise nobody could ever edit it again.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 401 })

  const { name } = await params
  if (!isBackupName(name)) {
    return NextResponse.json({ error: 'Unknown backup' }, { status: 400 })
  }

  let body: { id?: string; expectName?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const id = body.id
  if (!id) return NextResponse.json({ error: 'An order id is required' }, { status: 400 })

  try {
    const snapshot = readOrder(name, id)
    if (!snapshot) {
      return NextResponse.json({ error: 'That order is not in this backup' }, { status: 404 })
    }

    // The same guard the command-line tools use: a mistyped id cannot quietly
    // overwrite somebody else's order.
    if (body.expectName && snapshot.name !== body.expectName) {
      return NextResponse.json(
        { error: `Backup holds "${snapshot.name}" under that id, not "${body.expectName}"` },
        { status: 409 },
      )
    }

    const data: Record<string, unknown> = {}
    for (const field of COMPARED_FIELDS) data[field] = snapshot[field] ?? null
    // SQLite keeps booleans as 0/1; Prisma wants them as booleans.
    data.archived = Boolean(snapshot.archived)
    data.cancelled = Boolean(snapshot.cancelled)

    const existing = await prisma.order.findUnique({ where: { id } })

    const restored = await prisma.$transaction(async tx => {
      if (existing) {
        const after = await tx.order.update({ where: { id }, data })
        await recordOrderChanges(id, existing, after, { source: 'restore', tx })
        return { mode: 'updated' as const, order: after }
      }

      const after = await tx.order.create({
        data: {
          ...data,
          id,
          // Recreated whole, credential included — see the note above.
          editCode: (snapshot.editCode as string | null) ?? null,
          createdAt: snapshot.createdAt ? new Date(snapshot.createdAt as string) : undefined,
        } as never,
      })
      await recordOrderChanges(id, null, after, { source: 'restore', tx })
      return { mode: 'recreated' as const, order: after }
    })

    return NextResponse.json({ mode: restored.mode, id, name: restored.order.name })
  } catch (error) {
    console.error('Failed to restore order:', error)
    const message = error instanceof Error ? error.message : 'Failed to restore order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
