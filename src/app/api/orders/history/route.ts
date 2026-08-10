import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const FIELD_TO_EVENT: Record<string, string> = {
  // Both VIN fields surface as one `vin` event — see VIN_FIELD in lib/order-history.
  vin: 'vin',
  vinReceivedDate: 'vin',
  productionDate: 'production',
  papersReceivedDate: 'papers',
  deliveryDate: 'delivery',
  deliveryWindow: 'window',
  _created: 'created',
}

const ALL_EVENTS = ['vin', 'production', 'papers', 'delivery', 'window', 'created'] as const

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 200)
  const cursor = url.searchParams.get('cursor')
  const country = url.searchParams.get('country')?.split(',').filter(Boolean) ?? null
  const vehicleType = url.searchParams.get('vehicleType')
  const eventsParam = url.searchParams.get('events')?.split(',').filter(Boolean)
  const events = (eventsParam && eventsParam.length > 0 ? eventsParam : ALL_EVENTS) as readonly string[]
  // TOST-synced field changes (VIN, production, delivery, …) are real news and
  // are shown by default. Only the `_created` rows a bulk sheet import produces
  // are held back — those arrive hundreds at a time and would bury the feed.
  // `includeTost=false` drops everything the sync wrote.
  const includeTost = url.searchParams.get('includeTost') !== 'false'

  // Written as ORs on the non-nullable `field` column rather than a NOT over
  // `source`, so rows with a NULL source can't fall into SQL's three-valued
  // logic and vanish from the feed.
  const sourceFilter = includeTost
    ? {
        OR: [
          { field: { not: '_created' } },
          { source: null },
          { source: { not: 'tost' } },
        ],
      }
    : { OR: [{ source: null }, { source: { not: 'tost' } }] }

  const eventToFields = Object.entries(FIELD_TO_EVENT)
    .filter(([, ev]) => events.includes(ev))
    .map(([f]) => f)
  if (eventToFields.length === 0) {
    return NextResponse.json({ entries: [], nextCursor: null })
  }

  const where: import('@/generated/prisma/client').Prisma.OrderHistoryWhereInput = {
    field: { in: eventToFields },
    // Cursor is the previous page's tail `changedAt`. We use strict `<` here, so
    // rows sharing the exact same millisecond timestamp as the cursor will be
    // dropped from the next page. Acceptable trade-off for current data volume;
    // if TOST sync ever produces many same-ms history rows, switch to a composite
    // (changedAt, id) cursor.
    ...(cursor ? { changedAt: { lt: new Date(cursor) } } : {}),
    ...sourceFilter,
    order: {
      archived: false,
      cancelled: false,
      ...(country && country.length ? { country: { in: country } } : {}),
      ...(vehicleType ? { vehicleType } : {}),
    },
  }

  const rows = await prisma.orderHistory.findMany({
    where,
    orderBy: { changedAt: 'desc' },
    take: limit + 1,
    include: {
      order: {
        select: { id: true, name: true, country: true, vehicleType: true, model: true, drive: true },
      },
    },
  })

  const sliced = rows.slice(0, limit)
  const nextCursor = rows.length > limit ? sliced[sliced.length - 1].changedAt.toISOString() : null

  const entries = sliced.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    orderName: r.order.name,
    country: r.order.country,
    vehicleType: r.order.vehicleType,
    model: r.order.model,
    drive: r.order.drive,
    field: r.field,
    eventType: FIELD_TO_EVENT[r.field] ?? r.field,
    source: r.source,
    oldValue: r.oldValue,
    newValue: r.newValue,
    changedAt: r.changedAt.toISOString(),
  }))

  return NextResponse.json({ entries, nextCursor })
}
