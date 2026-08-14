import { prisma } from '@/lib/db'
import type { Prisma, Order } from '@/generated/prisma/client'

/**
 * Fields whose changes we record for the Updates Feed.
 * Add to TRACKED_FIELDS to expand the feed surface area.
 */
export const TRACKED_FIELDS = [
  'vin',
  'vinReceivedDate',
  'productionDate',
  'papersReceivedDate',
  'deliveryDate',
  'deliveryWindow',
] as const

export type TrackedField = (typeof TRACKED_FIELDS)[number]

/**
 * `vin` and `vinReceivedDate` describe the same real-world event ("VIN assigned")
 * and both map to the `vin` feed event. Plenty of entries only ever fill one of
 * the two — the sheet sync often has the VIN but no date, and users editing by
 * hand routinely skip "VIN erhalten am" — so both have to be tracked or the
 * update is invisible in the feed (issue #17). When a single edit sets both, the
 * VIN itself wins so the feed shows one entry instead of two.
 */
const VIN_FIELD = 'vin'
const VIN_DATE_FIELD = 'vinReceivedDate'

type OrderLike = Partial<Order>

function normalize(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s.length === 0 ? null : s
}

/**
 * Where a change came from.
 * - 'tost'  — synced from the TOST system
 * - 'web'   — typed in here, by an anonymous visitor or the order's owner
 * - null    — the sheet import and older rows written before this was tracked
 */
export type ChangeSource = 'tost' | 'web' | null

export interface RecordChangesOpts {
  source?: ChangeSource
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

  const changed = TRACKED_FIELDS.map((f) => ({
    field: f,
    oldV: normalize((before as Record<string, unknown>)[f]),
    newV: normalize((after as Record<string, unknown>)[f]),
  })).filter((c) => c.oldV !== c.newV)

  const fields = changed.some((c) => c.field === VIN_FIELD)
    ? changed.filter((c) => c.field !== VIN_DATE_FIELD)
    : changed

  for (const { field: f, oldV, newV } of fields) {
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
