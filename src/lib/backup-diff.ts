/**
 * Comparing a backup with what is live, and naming the files safely.
 *
 * Kept free of any filesystem or database access so the rules that decide what
 * an admin is shown — and what a URL is allowed to name — can be tested
 * directly.
 */

/**
 * The fields a comparison covers.
 *
 * Explicit rather than "every column", for two reasons. `updatedAt` moves
 * whenever anything else does, so including it turns one real change into two
 * findings. And `editCode`, `resetCode` and `resetCodeExpires` are the owner's
 * credentials: an admin comparing two backups has no business reading them, and
 * a field-level diff is exactly where a password hash would otherwise be
 * printed side by side with its replacement.
 */
export const COMPARED_FIELDS = [
  'name',
  'vehicleType',
  'orderDate',
  'country',
  'model',
  'range',
  'drive',
  'color',
  'interior',
  'wheels',
  'towHitch',
  'autopilot',
  'seats',
  'source',
  'tostUserId',
  'deliveryWindow',
  'deliveryLocation',
  'vin',
  'vinReceivedDate',
  'papersReceivedDate',
  'productionDate',
  'typeApproval',
  'typeVariant',
  'deliveryDate',
  'orderToProduction',
  'orderToVin',
  'orderToDelivery',
  'orderToPapers',
  'papersToDelivery',
  'archived',
  'cancelled',
] as const

/** Exactly the shape createBackup writes, and nothing else. */
const BACKUP_NAME = /^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.db$/

/**
 * Whether a string may be used as a backup filename.
 *
 * The name reaches the server in a URL, which makes it the one part of a
 * restore that somebody outside could choose. It is matched against the exact
 * shape this app writes rather than filtered for bad characters, so anything
 * unfamiliar is refused instead of sanitised — including a path that would
 * climb out of the backup directory, and the live database itself.
 */
export function isBackupName(name: string): boolean {
  return BACKUP_NAME.test(name)
}

export type FieldChange = { field: string; from: unknown; to: unknown }

export type OrderDiff = {
  /** In the live database, absent from the backup. */
  added: { id: string; name: string }[]
  /** In the backup, gone from the live database — the restorable ones. */
  removed: { id: string; name: string }[]
  changed: { id: string; name: string; fields: FieldChange[] }[]
}

type Row = Record<string, unknown>

/** SQLite stores booleans as 0/1, so a restored row can differ only in type. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null && b == null) return true
  if (typeof a === 'boolean' || typeof b === 'boolean') return Number(a) === Number(b)
  return false
}

function label(row: Row): { id: string; name: string } {
  return { id: String(row.id), name: String(row.name ?? '') }
}

/**
 * What changed between a backup and the current data.
 *
 * `before` is the backup, `after` is live, so "added" reads as what has
 * appeared since and "removed" as what has been lost — which is the direction
 * somebody looking at a backup is thinking in.
 */
export function diffOrders(before: Row[], after: Row[]): OrderDiff {
  const backupById = new Map(before.map(r => [String(r.id), r]))
  const liveById = new Map(after.map(r => [String(r.id), r]))

  const added = after.filter(r => !backupById.has(String(r.id))).map(label)
  const removed = before.filter(r => !liveById.has(String(r.id))).map(label)

  const changed: OrderDiff['changed'] = []
  for (const [id, backupRow] of backupById) {
    const liveRow = liveById.get(id)
    if (!liveRow) continue

    const fields: FieldChange[] = []
    for (const field of COMPARED_FIELDS) {
      if (!same(backupRow[field], liveRow[field])) {
        fields.push({ field, from: backupRow[field] ?? null, to: liveRow[field] ?? null })
      }
    }
    if (fields.length > 0) changed.push({ ...label(liveRow), fields })
  }

  return { added, removed, changed }
}
