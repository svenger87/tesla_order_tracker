import { setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/db'
import { fetchOrders } from '@/lib/orders-query'
import { HomeClient } from '@/components/HomeClient'
import type { Settings } from '@/lib/types'

/**
 * The home page renders with its data already in the HTML.
 *
 * It used to be a client component that mounted empty and then fetched orders,
 * settings and the admin flag before it could show anything — three round trips
 * during which the visitor saw skeleton bars, and a crawler saw nothing at all.
 * The orders and settings now come from the server render; only the admin check
 * still happens in the browser, because it depends on a cookie and must not
 * make the page uncacheable for everyone else.
 *
 * `fetchOrders` is shared with GET /api/orders, so the shape the client starts
 * with is exactly the shape its 30-second refresh returns.
 */
/**
 * Rendered per request, not at build time: the page's whole content is the
 * current order list, and the database does not exist while the image is built.
 * Reads are local SQLite, so this costs a few milliseconds.
 */
export const dynamic = 'force-dynamic'

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const [orders, settings] = await Promise.all([
    fetchOrders(),
    prisma.settings.findUnique({ where: { id: 'default' } }).catch(() => null),
  ])

  return (
    <HomeClient
      initialOrders={orders}
      initialSettings={settings as unknown as Settings | null}
    />
  )
}
