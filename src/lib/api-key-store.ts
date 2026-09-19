import { prisma } from './db'
import type { UsageEvent, UsageRow, UsageStore } from './api-usage'

export interface ApiKeyRecord {
  id: string
  name: string
  scopes: string
  ratePerMinute: number
  quotaPerDay: number
  revokedAt: Date | null
}

export interface ApiKeyLookup {
  findByHash(hash: string): Promise<ApiKeyRecord | null>
}

export const prismaApiKeyLookup: ApiKeyLookup = {
  findByHash: (hash) =>
    prisma.apiKey.findUnique({
      where: { keyHash: hash },
      select: { id: true, name: true, scopes: true, ratePerMinute: true, quotaPerDay: true, revokedAt: true },
    }),
}

export const prismaUsageStore: UsageStore = {
  async requestsOn(consumerId, day) {
    const result = await prisma.apiUsage.aggregate({
      where: { consumer: consumerId, day },
      _sum: { requests: true },
    })
    return result._sum.requests ?? 0
  },

  async record(event: UsageEvent) {
    const errors = event.isError ? 1 : 0
    await prisma.apiUsage.upsert({
      where: { consumer_day_endpoint: { consumer: event.consumerId, day: event.day, endpoint: event.endpoint } },
      create: { consumer: event.consumerId, day: event.day, endpoint: event.endpoint, requests: 1, errors },
      update: { requests: { increment: 1 }, errors: { increment: errors } },
    })
    if (!event.builtin) {
      // updateMany rather than update: a key deleted mid-request must not throw.
      await prisma.apiKey.updateMany({ where: { id: event.consumerId }, data: { lastUsedAt: event.at } })
    }
  },
}

export function usageRows(consumerId: string, sinceDay: string): Promise<UsageRow[]> {
  return prisma.apiUsage.findMany({
    where: { consumer: consumerId, day: { gte: sinceDay } },
    select: { day: true, endpoint: true, requests: true, errors: true },
  })
}

export async function requestsTodayByConsumer(day: string): Promise<Map<string, number>> {
  const groups = await prisma.apiUsage.groupBy({
    by: ['consumer'],
    where: { day },
    _sum: { requests: true },
  })
  return new Map(groups.map(g => [g.consumer, g._sum.requests ?? 0]))
}
