const DAY_MS = 86_400_000

/** The UTC calendar day, as stored in ApiUsage.day. */
export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function secondsUntilUtcMidnight(ms: number): number {
  const next = Math.floor(ms / DAY_MS) * DAY_MS + DAY_MS
  return Math.max(1, Math.ceil((next - ms) / 1000))
}

export interface UsageEvent {
  consumerId: string
  builtin: boolean
  day: string
  endpoint: string
  isError: boolean
  at: Date
}

/** Where usage is counted. The Prisma implementation is in api-key-store.ts. */
export interface UsageStore {
  requestsOn(consumerId: string, day: string): Promise<number>
  record(event: UsageEvent): Promise<void>
}

export interface UsageRow {
  day: string
  endpoint: string
  requests: number
  errors: number
}

export interface UsageSummary {
  daily: { day: string; requests: number; errors: number }[]
  byEndpoint: { endpoint: string; requests: number; errors: number }[]
  totals: { requests: number; errors: number }
}

/** Daily series (zero-filled, oldest first) and per-endpoint totals for the last `days` days. */
export function summarizeUsage(rows: UsageRow[], days: number, nowMs: number): UsageSummary {
  const daily = new Map<string, { day: string; requests: number; errors: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const day = utcDay(nowMs - i * DAY_MS)
    daily.set(day, { day, requests: 0, errors: 0 })
  }

  const byEndpoint = new Map<string, { endpoint: string; requests: number; errors: number }>()
  const totals = { requests: 0, errors: 0 }

  for (const row of rows) {
    const bucket = daily.get(row.day)
    if (!bucket) continue
    bucket.requests += row.requests
    bucket.errors += row.errors
    const ep = byEndpoint.get(row.endpoint) ?? { endpoint: row.endpoint, requests: 0, errors: 0 }
    ep.requests += row.requests
    ep.errors += row.errors
    byEndpoint.set(row.endpoint, ep)
    totals.requests += row.requests
    totals.errors += row.errors
  }

  return {
    daily: [...daily.values()],
    byEndpoint: [...byEndpoint.values()].sort((a, b) => b.requests - a.requests),
    totals,
  }
}
