import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { normalizeDateFields, calculateTimePeriods, calculateDaysBetween, findDateSequenceError } from '@/lib/date-utils'
import { checkRateLimit, clientKey } from '@/lib/rate-limit'
import { computeETag, isNotModified } from '@/lib/http-cache'
import { fetchOrders } from '@/lib/orders-query'
import { recordOrderChanges } from '@/lib/order-history'
import {
  COLORS,
  INTERIORS,
  AUTOPILOT_OPTIONS,
  TOW_HITCH_OPTIONS,
  COUNTRIES,
} from '@/lib/types'
import { applyVehicleConstraints } from '@/lib/vehicle-constraints'

// Build reverse lookup maps: display label → internal value
function buildLabelToValueMap(options: { value: string; label: string }[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const opt of options) {
    // Map both the label and a lowercase version for case-insensitive matching
    map.set(opt.label.toLowerCase(), opt.value)
    map.set(opt.value.toLowerCase(), opt.value)
  }
  return map
}

const COLOR_MAP = buildLabelToValueMap(COLORS)
const INTERIOR_MAP = buildLabelToValueMap(INTERIORS)
const AUTOPILOT_MAP = buildLabelToValueMap(AUTOPILOT_OPTIONS)
const TOW_HITCH_MAP = buildLabelToValueMap(TOW_HITCH_OPTIONS)
// Country map includes "flag + label" patterns like "🇦🇹 Österreich" → "at"
const COUNTRY_MAP = new Map<string, string>()
for (const c of COUNTRIES) {
  COUNTRY_MAP.set(c.value.toLowerCase(), c.value)
  COUNTRY_MAP.set(c.label.toLowerCase(), c.value)
  COUNTRY_MAP.set(`${c.flag} ${c.label}`.toLowerCase(), c.value)
}

// Normalize order field values: map display labels back to internal values
function normalizeOrderData(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data }

  const normalize = (field: string, map: Map<string, string>) => {
    const val = result[field]
    if (typeof val !== 'string' || !val.trim()) return
    const lookup = map.get(val.toLowerCase().trim())
    if (lookup) result[field] = lookup
  }

  normalize('color', COLOR_MAP)
  normalize('interior', INTERIOR_MAP)
  normalize('autopilot', AUTOPILOT_MAP)
  normalize('towHitch', TOW_HITCH_MAP)
  normalize('country', COUNTRY_MAP)

  // Normalize stray "-" to "nv" for towHitch
  if (result.towHitch === '-') result.towHitch = 'nv'

  return result
}

// Bcrypt-aware password comparison
async function comparePassword(input: string, stored: string): Promise<boolean> {
  if (stored.startsWith('$2')) {
    return bcrypt.compare(input, stored)
  }
  return input === stored
}

// Anyone may create and edit without an account, so these are the only brakes.
const CREATE_RULE = { limit: 5, windowMs: 60 * 60 * 1000 }
const WRITE_RULE = { limit: 60, windowMs: 15 * 60 * 1000 }

function rateLimited(request: NextRequest, bucket: string, rule: { limit: number; windowMs: number }) {
  const limit = checkRateLimit(clientKey(request, bucket), rule)
  if (limit.allowed) return null
  return NextResponse.json(
    { error: 'Zu viele Anfragen. Bitte später erneut versuchen.', code: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
  )
}

/**
 * Reject chronologically impossible dates. These fields are community-editable
 * and feed the public wait-time medians, so this is the only defence the numbers
 * on the front page have.
 */
function dateSequenceError(data: Record<string, unknown>) {
  const code = findDateSequenceError(data)
  if (!code) return null
  const messages: Record<string, string> = {
    ORDER_DATE_IN_FUTURE: 'Das Bestelldatum kann nicht in der Zukunft liegen.',
    PRODUCTION_BEFORE_ORDER: 'Das Produktionsdatum kann nicht vor dem Bestelldatum liegen.',
    PAPERS_BEFORE_ORDER: 'Das Papierdatum kann nicht vor dem Bestelldatum liegen.',
    PAPERS_BEFORE_PRODUCTION: 'Das Papierdatum kann nicht vor dem Produktionsdatum liegen.',
    DELIVERY_BEFORE_ORDER: 'Das Auslieferungsdatum kann nicht vor dem Bestelldatum liegen.',
    DELIVERY_BEFORE_PRODUCTION: 'Das Auslieferungsdatum kann nicht vor dem Produktionsdatum liegen.',
    DELIVERY_BEFORE_PAPERS: 'Das Auslieferungsdatum kann nicht vor dem Papierdatum liegen.',
  }
  return NextResponse.json(
    { error: messages[code] ?? 'Die Datumsangaben sind nicht plausibel.', code },
    { status: 400 }
  )
}

/**
 * "Storniert" is owner-driven: whoever holds the edit code can flag their order
 * as cancelled and clear it again. `cancelledAt` is stamped only on the
 * transition, so re-saving an already-cancelled order keeps the original date.
 * An absent `cancelled` key leaves the state alone — the TOST field editor and
 * any older client post partial bodies and must not silently un-cancel.
 */
function cancellationFields(
  data: Record<string, unknown>,
  before: { cancelled?: boolean } | null,
): { cancelled?: boolean; cancelledAt?: Date | null } {
  if (typeof data.cancelled !== 'boolean') return {}
  if (data.cancelled === (before?.cancelled ?? false)) return {}
  return { cancelled: data.cancelled, cancelledAt: data.cancelled ? new Date() : null }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    // Only admins may see archived orders
    const admin = await getAdminFromCookie()
    const orders = await fetchOrders({ includeArchived: Boolean(admin && includeArchived) })

    // Every open tab polls this every 30 seconds and gets the entire dataset
    // back. Most of those polls return exactly what the client already has.
    const etag = computeETag(orders)
    const cacheHeaders = {
      // max-age=0 + must-revalidate makes the browser re-ask every time and send
      // If-None-Match, which is what turns an unchanged poll into an empty 304.
      // Without it the response carried only s-maxage, which shared caches honour
      // and browsers ignore, so no client ever revalidated.
      'Cache-Control': 'public, max-age=0, must-revalidate, s-maxage=5, stale-while-revalidate=25',
      'ETag': etag,
    }

    if (isNotModified(request.headers.get('if-none-match'), etag)) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders })
    }

    return NextResponse.json(orders, { headers: cacheHeaders })
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    // Return empty array to prevent frontend crash
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const throttled = rateLimited(request, 'orders-create', CREATE_RULE)
    if (throttled) return throttled

    const body = await request.json()

    // Validate required fields for vehicle configuration
    const requiredFields = [
      { field: 'name', label: 'Name' },
      { field: 'model', label: 'Model' },
      { field: 'color', label: 'Farbe' },
      { field: 'interior', label: 'Innenraum' },
      { field: 'wheels', label: 'Felgen' },
      { field: 'towHitch', label: 'AHK' },
      { field: 'autopilot', label: 'Autopilot' },
      { field: 'country', label: 'Land' },
      { field: 'deliveryLocation', label: 'Ort (Auslieferung)' },
    ] as const

    for (const { field, label } of requiredFields) {
      if (!body[field] || (typeof body[field] === 'string' && !body[field].trim())) {
        return NextResponse.json(
          { error: `${label} ist erforderlich`, code: 'FIELD_REQUIRED', field: label },
          { status: 400 }
        )
      }
    }

    // Validate username minimum length
    if (typeof body.name === 'string' && body.name.trim().length < 3) {
      return NextResponse.json(
        { error: 'Benutzername muss mindestens 3 Zeichen lang sein', code: 'NAME_TOO_SHORT' },
        { status: 400 }
      )
    }

    // Validate password (required for all new orders)
    if (!body.customPassword) {
      return NextResponse.json(
        { error: 'Passwort ist erforderlich', code: 'PASSWORD_REQUIRED' },
        { status: 400 }
      )
    }
    if (body.customPassword.length < 6) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 6 Zeichen lang sein', code: 'PASSWORD_TOO_SHORT' },
        { status: 400 }
      )
    }
    if (!/\d/.test(body.customPassword)) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens eine Zahl enthalten', code: 'PASSWORD_NEEDS_DIGIT' },
        { status: 400 }
      )
    }

    // Hash the password with bcrypt
    const editCode = await bcrypt.hash(body.customPassword, 10)

    // Normalize display labels → internal values
    const normalizedBody = normalizeOrderData(body)

    // Normalize date fields (fix missing leading zeros, reject garbage)
    normalizeDateFields(normalizedBody)

    const sequenceError = dateSequenceError(normalizedBody)
    if (sequenceError) return sequenceError

    // Calculate time periods from dates
    const timePeriods = calculateTimePeriods(normalizedBody)

    // Apply vehicle constraints (set unavailable options appropriately)
    const constrainedData = applyVehicleConstraints(normalizedBody)

    const order = await prisma.order.create({
      data: {
        name: constrainedData.name as string,
        vehicleType: (constrainedData.vehicleType as string) || 'Model Y',
        orderDate: (constrainedData.orderDate as string) || null,
        country: (constrainedData.country as string) || null,
        model: (constrainedData.model as string) || null,
        range: (constrainedData.range as string) || null,
        drive: (constrainedData.drive as string) || null,
        color: (constrainedData.color as string) || null,
        interior: (constrainedData.interior as string) || null,
        wheels: (constrainedData.wheels as string) || null,
        towHitch: (constrainedData.towHitch as string) || null,
        autopilot: (constrainedData.autopilot as string) || null,
        seats: (constrainedData.seats as string) || null,
        deliveryWindow: (constrainedData.deliveryWindow as string) || null,
        deliveryLocation: (constrainedData.deliveryLocation as string) || null,
        vin: (constrainedData.vin as string) || null,
        vinReceivedDate: (constrainedData.vinReceivedDate as string) || null,
        papersReceivedDate: (constrainedData.papersReceivedDate as string) || null,
        productionDate: (constrainedData.productionDate as string) || null,
        typeApproval: (constrainedData.typeApproval as string) || null,
        typeVariant: (constrainedData.typeVariant as string) || null,
        deliveryDate: (constrainedData.deliveryDate as string) || null,
        ...timePeriods,
        editCode,
      },
    })

    await recordOrderChanges(order.id, null, order)

    return NextResponse.json({
      id: order.id,
      isCustomPassword: true,
      message: 'Order created successfully'
    })
  } catch (error) {
    console.error('Failed to create order:', error)
    return NextResponse.json({ error: 'Failed to create order', code: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const throttled = rateLimited(request, 'orders-write', WRITE_RULE)
    if (throttled) return throttled

    const { id, editCode, isLegacy, newEditCode, expectedUpdatedAt, ...rawData } = body

    // Normalize display labels → internal values
    const data = normalizeOrderData(rawData) as typeof rawData

    // Normalize date fields
    normalizeDateFields(data)

    const admin = await getAdminFromCookie()

    // TOST-managed orders: only papersReceivedDate, typeApproval, typeVariant can be edited via webapp
    const tostCheck = await prisma.order.findUnique({ where: { id }, select: { source: true } })
    if (tostCheck?.source === 'tost') {
      const tostUserEditableFields = ['orderDate', 'papersReceivedDate', 'productionDate', 'typeApproval', 'typeVariant']
      const attemptedFields = Object.keys(rawData).filter(k => k !== 'id')
      const disallowedFields = attemptedFields.filter(f => !tostUserEditableFields.includes(f))
      if (disallowedFields.length > 0) {
        return NextResponse.json({ error: 'This order is managed by TOST. Only order date, papers received date, type approval, and type variant can be edited.', code: 'TOST_FIELDS_RESTRICTED' }, { status: 403 })
      }
      // Allow the edit — update only the allowed fields directly.
      // Read from `data`, not `rawData`: normalizeDateFields() ran on the copy,
      // so taking raw values here wrote unnormalized dates straight to the DB.
      const updateData: Record<string, unknown> = {}
      for (const field of tostUserEditableFields) {
        if (field in rawData) {
          updateData[field] = data[field] || null
        }
      }
      if (Object.keys(updateData).length > 0) {
        // Fetch existing dates for recalculation
        const existingOrder = await prisma.order.findUnique({
          where: { id },
          select: { orderDate: true, deliveryDate: true, vinReceivedDate: true, productionDate: true, papersReceivedDate: true },
        })

        // Validate the merged chronology, not just the submitted fields — a
        // single new date only becomes implausible next to the stored ones.
        const tostSequenceError = dateSequenceError({ ...existingOrder, ...updateData })
        if (tostSequenceError) return tostSequenceError

        // Recalculate papersToDelivery if papersReceivedDate changed
        if (updateData.papersReceivedDate) {
          if (existingOrder?.deliveryDate) {
            const papersToDelivery = calculateDaysBetween(updateData.papersReceivedDate as string, existingOrder.deliveryDate)
            if (papersToDelivery !== null) updateData.papersToDelivery = papersToDelivery
          }
          const effectiveOrderDate = (updateData.orderDate as string) ?? existingOrder?.orderDate
          if (effectiveOrderDate) {
            const orderToPapers = calculateDaysBetween(effectiveOrderDate, updateData.papersReceivedDate as string)
            if (orderToPapers !== null) updateData.orderToPapers = orderToPapers
          }
        }

        // Recalculate all order-based time periods if orderDate or productionDate changed
        if ((updateData.orderDate || updateData.productionDate) && existingOrder) {
          const timePeriods = calculateTimePeriods({
            orderDate: (updateData.orderDate as string) ?? existingOrder.orderDate ?? undefined,
            productionDate: (updateData.productionDate as string) ?? existingOrder.productionDate ?? undefined,
            vinReceivedDate: existingOrder.vinReceivedDate ?? undefined,
            deliveryDate: existingOrder.deliveryDate ?? undefined,
            papersReceivedDate: (updateData.papersReceivedDate as string) ?? existingOrder.papersReceivedDate ?? undefined,
          })
          for (const [key, value] of Object.entries(timePeriods)) {
            if (value !== null) updateData[key] = value
          }
        }
        const updated = await prisma.$transaction(async (tx) => {
          const before = await tx.order.findUnique({ where: { id } })
          const u = await tx.order.update({ where: { id }, data: updateData })
          // 'web', not 'tost': this edit came from an anonymous visitor filling in
          // fields TOST does not track. Logging it as 'tost' made a community
          // entry look like it had been synced from the source system.
          await recordOrderChanges(id, before, u, { tx, source: 'web' })
          return u
        })
        return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt, message: 'Order updated' })
      }
      return NextResponse.json({ message: 'No changes' })
    }

    // Check authorization - either admin or valid edit code
    if (!admin) {
      const order = await prisma.order.findUnique({ where: { id } })

      if (!order) {
        return NextResponse.json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' }, { status: 404 })
      }

      // Legacy order flow - user verified via username
      if (isLegacy && order.editCode === null) {
        // For legacy orders, user must set a new password
        if (!newEditCode) {
          return NextResponse.json({ error: 'Neues Passwort erforderlich für Bestandseinträge', code: 'LEGACY_PASSWORD_REQUIRED' }, { status: 400 })
        }

        // Validate new password
        if (newEditCode.length < 6) {
          return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen lang sein', code: 'PASSWORD_TOO_SHORT' }, { status: 400 })
        }
        if (!/\d/.test(newEditCode)) {
          return NextResponse.json({ error: 'Passwort muss mindestens eine Zahl enthalten', code: 'PASSWORD_NEEDS_DIGIT' }, { status: 400 })
        }

        const legacySequenceError = dateSequenceError(data)
        if (legacySequenceError) return legacySequenceError

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newEditCode, 10)

        // Calculate time periods from dates
        const timePeriods = calculateTimePeriods(data)

        // Apply vehicle constraints
        const constrainedData = applyVehicleConstraints(data)

        // Update order with new hashed password
        const updated = await prisma.$transaction(async (tx) => {
          const before = await tx.order.findUnique({ where: { id } })
          const u = await tx.order.update({
            where: { id },
            data: {
              editCode: hashedPassword, // Set the new hashed password
              name: constrainedData.name as string,
              vehicleType: (constrainedData.vehicleType as string) || 'Model Y',
              orderDate: (constrainedData.orderDate as string) || null,
              country: (constrainedData.country as string) || null,
              model: (constrainedData.model as string) || null,
              range: (constrainedData.range as string) || null,
              drive: (constrainedData.drive as string) || null,
              color: (constrainedData.color as string) || null,
              interior: (constrainedData.interior as string) || null,
              wheels: (constrainedData.wheels as string) || null,
              towHitch: (constrainedData.towHitch as string) || null,
              autopilot: (constrainedData.autopilot as string) || null,
              deliveryWindow: (constrainedData.deliveryWindow as string) || null,
              deliveryLocation: (constrainedData.deliveryLocation as string) || null,
              vin: (constrainedData.vin as string) || null,
              vinReceivedDate: (constrainedData.vinReceivedDate as string) || null,
              papersReceivedDate: (constrainedData.papersReceivedDate as string) || null,
              productionDate: (constrainedData.productionDate as string) || null,
              typeApproval: (constrainedData.typeApproval as string) || null,
              typeVariant: (constrainedData.typeVariant as string) || null,
              deliveryDate: (constrainedData.deliveryDate as string) || null,
              ...cancellationFields(constrainedData, before),
              ...timePeriods,
            },
          })
          await recordOrderChanges(id, before, u, { tx })
          return u
        })

        return NextResponse.json({
          id: updated.id,
          message: 'Eintrag aktualisiert und neues Passwort gesetzt!',
        })
      }

      // Standard edit code verification
      if (!editCode) {
        return NextResponse.json({ error: 'Edit code required', code: 'EDIT_CODE_REQUIRED' }, { status: 401 })
      }

      if (!order.editCode || !(await comparePassword(editCode, order.editCode))) {
        return NextResponse.json({ error: 'Invalid edit code', code: 'INVALID_EDIT_CODE' }, { status: 401 })
      }
    }

    const putSequenceError = dateSequenceError(data)
    if (putSequenceError) return putSequenceError

    // Optimistic locking: check if order was modified since user loaded it
    if (expectedUpdatedAt) {
      const currentOrder = await prisma.order.findUnique({ where: { id } })
      if (currentOrder && currentOrder.updatedAt) {
        const expectedTime = new Date(expectedUpdatedAt).getTime()
        const actualTime = new Date(currentOrder.updatedAt).getTime()
        if (actualTime > expectedTime) {
          return NextResponse.json({
            error: 'Dieser Eintrag wurde zwischenzeitlich von jemand anderem geändert. Bitte lade die Seite neu und versuche es erneut.',
            code: 'CONFLICT'
          }, { status: 409 })
        }
      }
    }

    // Calculate time periods from dates
    const timePeriods = calculateTimePeriods(data)

    // Apply vehicle constraints
    const constrainedData = applyVehicleConstraints(data)

    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.order.findUnique({ where: { id } })
      const u = await tx.order.update({
        where: { id },
        data: {
          name: constrainedData.name as string,
          vehicleType: (constrainedData.vehicleType as string) || 'Model Y',
          orderDate: (constrainedData.orderDate as string) || null,
          country: (constrainedData.country as string) || null,
          model: (constrainedData.model as string) || null,
          range: (constrainedData.range as string) || null,
          drive: (constrainedData.drive as string) || null,
          color: (constrainedData.color as string) || null,
          interior: (constrainedData.interior as string) || null,
          wheels: (constrainedData.wheels as string) || null,
          towHitch: (constrainedData.towHitch as string) || null,
          autopilot: (constrainedData.autopilot as string) || null,
          seats: (constrainedData.seats as string) || null,
          deliveryWindow: (constrainedData.deliveryWindow as string) || null,
          deliveryLocation: (constrainedData.deliveryLocation as string) || null,
          vin: (constrainedData.vin as string) || null,
          vinReceivedDate: (constrainedData.vinReceivedDate as string) || null,
          papersReceivedDate: (constrainedData.papersReceivedDate as string) || null,
          productionDate: (constrainedData.productionDate as string) || null,
          typeApproval: (constrainedData.typeApproval as string) || null,
          typeVariant: (constrainedData.typeVariant as string) || null,
          deliveryDate: (constrainedData.deliveryDate as string) || null,
          ...cancellationFields(constrainedData, before),
          ...timePeriods,
        },
      })
      await recordOrderChanges(id, before, u, { tx })
      return u
    })

    return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt, message: 'Order updated successfully' })
  } catch (error) {
    console.error('Failed to update order:', error)
    return NextResponse.json({ error: 'Failed to update order', code: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required', code: 'ADMIN_REQUIRED' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    await prisma.order.delete({ where: { id } })
    return NextResponse.json({ message: 'Order deleted successfully' })
  } catch (error) {
    console.error('Failed to delete order:', error)
    return NextResponse.json({ error: 'Failed to delete order', code: 'SERVER_ERROR' }, { status: 500 })
  }
}
