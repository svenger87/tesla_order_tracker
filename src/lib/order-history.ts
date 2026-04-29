import { prisma } from '@/lib/db'
import type { Prisma, Order } from '@/generated/prisma/client'

/**
 * Fields whose changes we record for the Updates Feed.
 * Add to TRACKED_FIELDS to expand the feed surface area.
 */
export const TRACKED_FIELDS = [
  'vinReceivedDate',
  'productionDate',
  'papersReceivedDate',
  'deliveryDate',
  'deliveryWindow',
] as const

export type TrackedField = (typeof TRACKED_FIELDS)[number]

type OrderLike = Partial<Order>

function normalize(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s.length === 0 ? null : s
}

export interface RecordChangesOpts {
  source?: 'tost' | null
  tx?: Prisma.TransactionClient
}

/**
 * Records changes for a single order.
 * - before === null → emits a synthetic `_created` row.
 * - Otherwise diffs TRACKED_FIELDS and emits one row per actual change.
 * Safe to call inside a transaction by passing opts.tx.
 */
export async function recordOrderChanges(
  orderId: string,
  before: OrderLike | null,
  after: OrderLike,
  opts: RecordChangesOpts = {},
): Promise<void> {
  const client = opts.tx ?? prisma
  const source = opts.source ?? null

  if (before === null) {
    await client.orderHistory.create({
      data: {
        orderId,
        field: '_created',
        oldValue: null,
        newValue: normalize((after as { name?: unknown }).name),
        source,
      },
    })
    return
  }

  const FLAP_WINDOW_MS = 5 * 60 * 1000

  for (const f of TRACKED_FIELDS) {
    const oldV = normalize((before as Record<string, unknown>)[f])
    const newV = normalize((after as Record<string, unknown>)[f])
    if (oldV === newV) continue

    const recent = await client.orderHistory.findFirst({
      where: { orderId, field: f, source },
      orderBy: { changedAt: 'desc' },
    })

    const isRevert = !!recent
      && recent.newValue === oldV
      && recent.oldValue === newV
      && (Date.now() - recent.changedAt.getTime()) < FLAP_WINDOW_MS

    if (isRevert) {
      await client.orderHistory.delete({ where: { id: recent.id } })
    } else {
      await client.orderHistory.create({
        data: { orderId, field: f, oldValue: oldV, newValue: newV, source },
      })
    }
  }
}
