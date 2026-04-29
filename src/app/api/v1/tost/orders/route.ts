import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withTostAuth } from '@/lib/tost-auth'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { calculateTimePeriods, orderSelectFields } from '@/lib/tost-helpers'
import { normalizeDateFields } from '@/lib/date-utils'
import { trackApiEvent } from '@/lib/umami'
import { ApiOrder } from '@/lib/api-types'
import { recordOrderChanges } from '@/lib/order-history'

// Build the data fields from a TOST request body
function buildOrderData(body: Record<string, unknown>) {
  normalizeDateFields(body)
  return {
    name: (body.name as string).trim(),
    vehicleType: (body.vehicleType as string) || 'Model Y',
    orderDate: (body.orderDate as string) || null,
    country: (body.country as string) || null,
    model: (body.model as string) || null,
    range: (body.range as string) || null,
    drive: (body.drive as string) || null,
    color: (body.color as string) || null,
    interior: (body.interior as string) || null,
    wheels: (body.wheels as string) || null,
    towHitch: (body.towHitch as string) || null,
    autopilot: (body.autopilot as string) || null,
    seats: (body.seats as string) || null,
    deliveryWindow: (body.deliveryWindow as string) || null,
    deliveryLocation: (body.deliveryLocation as string) || null,
    vin: (body.vin as string) || null,
    vinReceivedDate: (body.vinReceivedDate as string) || null,
    papersReceivedDate: (body.papersReceivedDate as string) || null,
    productionDate: (body.productionDate as string) || null,
    typeApproval: (body.typeApproval as string) || null,
    typeVariant: (body.typeVariant as string) || null,
    deliveryDate: (body.deliveryDate as string) || null,
    tostUserId: (body.tostUserId as string) || null,
  }
}

// POST /api/v1/tost/orders - Create a new TOST-managed order
export const POST = withTostAuth(async (request: NextRequest) => {
  let bodyName: string | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {}
  try {
    body = await request.json()
    bodyName = body?.name as string | undefined

    if (!body.name?.trim()) {
      return ApiErrors.validationError('Validation failed', {
        name: 'Name is required',
      })
    }

    if (body.name.trim().length < 3) {
      return ApiErrors.validationError('Validation failed', {
        name: 'Name must be at least 3 characters',
      })
    }

    const timePeriods = calculateTimePeriods(body)
    const orderData = buildOrderData(body)

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          ...(body.id && { id: body.id }),
          ...orderData,
          source: 'tost',
          ...timePeriods,
        },
      })
      await recordOrderChanges(created.id, null, created, { source: 'tost', tx })
      return created
    })

    trackApiEvent({ name: 'tost-create-order', url: '/api/v1/tost/orders', data: { orderId: order.id, vehicleType: body.vehicleType || 'Model Y', customId: !!body.id } })

    return createApiSuccessResponse(
      { id: order.id, message: 'Order created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('TOST orders POST error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    if (errorMsg.includes('Unique constraint')) {
      // If the conflicting order is already TOST-owned by ID, upsert it (idempotent retry)
      if (body?.id) {
        const existing = await prisma.order.findUnique({
          where: { id: body.id },
          select: { id: true, source: true },
        })
        if (existing?.source === 'tost') {
          const timePeriods = calculateTimePeriods(body)
          const orderData = buildOrderData(body)
          await prisma.$transaction(async (tx) => {
            const before = await tx.order.findUnique({ where: { id: body.id } })
            const u = await tx.order.update({
              where: { id: body.id },
              data: { ...orderData, ...timePeriods },
            })
            await recordOrderChanges(u.id, before, u, { source: 'tost', tx })
            return u
          })
          trackApiEvent({ name: 'tost-create-order-upsert', url: '/api/v1/tost/orders', data: { orderId: body.id } })
          return createApiSuccessResponse(
            { id: body.id, message: 'Order already existed (TOST-owned), updated successfully' },
            { status: 200 }
          )
        }
      }

      // Auto-claim webapp order with same name (name+orderDate unique conflict)
      if (bodyName) {
        const existing = await prisma.order.findFirst({
          where: { name: bodyName.trim(), OR: [{ source: null }, { source: { not: 'tost' } }] },
          select: { id: true },
        })
        if (existing) {
          const timePeriods = calculateTimePeriods(body)
          const orderData = buildOrderData(body)
          const newId = body.id as string | undefined

          if (newId && newId !== existing.id) {
            // Re-key: delete old webapp order, create with TOST ID
            const oldOrder = await prisma.order.findUnique({ where: { id: existing.id } })
            if (oldOrder) {
              const { id: _oldId, editCode: _editCode, createdAt, updatedAt: _updatedAt, ...oldData } = oldOrder
              await prisma.$transaction(async (tx) => {
                await tx.order.delete({ where: { id: existing.id } })
                const created = await tx.order.create({
                  data: {
                    ...oldData,
                    ...orderData,
                    id: newId,
                    source: 'tost',
                    ...timePeriods,
                    createdAt,
                  },
                })
                await recordOrderChanges(created.id, null, created, { source: 'tost', tx })
                return created
              })
              trackApiEvent({ name: 'tost-auto-claim-rekey', url: '/api/v1/tost/orders', data: { oldId: existing.id, newId, orderName: bodyName } })
              return createApiSuccessResponse(
                { id: newId, message: `Existing webapp order claimed and re-keyed successfully` },
                { status: 200 }
              )
            }
          } else {
            // Claim in place
            await prisma.$transaction(async (tx) => {
              const before = await tx.order.findUnique({ where: { id: existing.id } })
              const u = await tx.order.update({
                where: { id: existing.id },
                data: {
                  ...orderData,
                  source: 'tost',
                  ...timePeriods,
                },
              })
              await recordOrderChanges(u.id, before, u, { source: 'tost', tx })
              return u
            })
            trackApiEvent({ name: 'tost-auto-claim', url: '/api/v1/tost/orders', data: { orderId: existing.id, orderName: bodyName } })
            return createApiSuccessResponse(
              { id: existing.id, message: `Existing webapp order claimed successfully` },
              { status: 200 }
            )
          }
        }
      }

      return ApiErrors.conflict('An order with this ID already exists.')
    }
    return ApiErrors.serverError('Failed to create order')
  }
})

// GET /api/v1/tost/orders - Find orders by id, name, or tostUserId
// At least one filter is required: ?id=xxx or ?name=xxx or ?tostUserId=xxx
export const GET = withTostAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const name = searchParams.get('name')
    const tostUserId = searchParams.get('tostUserId')

    if (!id && !name && !tostUserId) {
      return ApiErrors.validationError('Validation failed', {
        filter: 'At least one filter is required: id, name, or tostUserId',
      })
    }

    // If searching by ID, return single order directly
    if (id) {
      const order = await prisma.order.findUnique({
        where: { id },
        select: orderSelectFields,
      })

      if (!order) {
        return createApiSuccessResponse([], { count: 0 })
      }

      const apiOrder: ApiOrder = {
        ...order,
        archivedAt: order.archivedAt?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      }

      return createApiSuccessResponse([apiOrder], { count: 1 })
    }

    // Build where clause from provided filters
    const where: Record<string, unknown> = { archived: false }
    if (name) where.name = decodeURIComponent(name).trim()
    if (tostUserId) where.tostUserId = decodeURIComponent(tostUserId)

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: orderSelectFields,
    })

    const apiOrders: ApiOrder[] = orders.map((order) => ({
      ...order,
      archivedAt: order.archivedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }))

    trackApiEvent({ name: 'tost-find-orders', url: '/api/v1/tost/orders', data: { filterBy: id ? 'id' : name ? 'name' : 'tostUserId', resultCount: apiOrders.length } })

    return createApiSuccessResponse(apiOrders, { count: apiOrders.length })
  } catch (error) {
    console.error('TOST orders GET error:', error)
    return ApiErrors.serverError('Failed to fetch orders')
  }
})
