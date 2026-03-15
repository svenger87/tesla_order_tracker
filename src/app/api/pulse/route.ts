import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { Order } from '@/lib/types'
import { parseGermanDate } from '@/lib/statistics'

function getISOWeekNumber(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { year: d.getUTCFullYear(), week: weekNo }
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { archived: false },
    }) as unknown as Order[]

    const totalOrders = orders.length
    const deliveredOrders = orders.filter(o => o.deliveryDate).length
    const deliveredPercent = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0

    // Average delivery days from the pre-calculated orderToDelivery field
    const deliveryDays = orders
      .filter(o => o.orderToDelivery !== null && o.orderToDelivery !== undefined)
      .map(o => o.orderToDelivery as number)
      .filter(d => d >= 0 && d <= 365)
    const avgDeliveryDays = deliveryDays.length > 0
      ? Math.round(deliveryDays.reduce((s, d) => s + d, 0) / deliveryDays.length)
      : null

    // VINs this week
    const now = new Date()
    const currentWeek = getISOWeekNumber(now)
    const vinsThisWeek = orders.filter(o => {
      const d = parseGermanDate(o.vinReceivedDate)
      if (!d) return false
      const w = getISOWeekNumber(d)
      return w.year === currentWeek.year && w.week === currentWeek.week
    }).length

    const response = NextResponse.json({
      totalOrders,
      deliveredOrders,
      deliveredPercent,
      avgDeliveryDays,
      vinsThisWeek,
    })

    response.headers.set('Cache-Control', 'public, max-age=300')
    return response
  } catch (error) {
    console.error('Failed to fetch pulse data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pulse data' },
      { status: 500 }
    )
  }
}
