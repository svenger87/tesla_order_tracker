import { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db'
import { Order, COLORS, COUNTRIES, VehicleType } from '@/lib/types'
import { getOrderStatus } from '@/lib/statistics'
import { predictDelivery } from '@/lib/prediction'
import { Link } from '@/i18n/navigation'
import { ArrowLeft, Search, PlusCircle, MapPin, Calendar, Hash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TrackingPageClient } from './client'

// Helpers
function findColorInfo(colorLabel: string | null) {
  if (!colorLabel) return null
  const normalizedLabel = colorLabel.toLowerCase().trim()
  return COLORS.find(c =>
    normalizedLabel.includes(c.label.toLowerCase()) ||
    c.label.toLowerCase().includes(normalizedLabel) ||
    c.value === normalizedLabel
  )
}

function findCountryInfo(country: string | null) {
  if (!country) return null
  return COUNTRIES.find(c => c.value === country || c.label.toLowerCase() === country.toLowerCase())
}

export async function generateMetadata({ params }: { params: Promise<{ name: string; locale: string }> }): Promise<Metadata> {
  const { name, locale } = await params
  const decodedName = decodeURIComponent(name)
  const t = await getTranslations({ locale, namespace: 'tracking' })

  return {
    title: `${decodedName} — Tesla Order Tracker`,
    description: t('orderDetails'),
    robots: 'noindex',
    openGraph: {
      title: `${decodedName} — Tesla Order Tracker`,
      description: t('orderDetails'),
      type: 'website',
    },
  }
}

export default async function TrackPage({ params }: { params: Promise<{ name: string; locale: string }> }) {
  const { name, locale } = await params
  setRequestLocale(locale)
  const decodedName = decodeURIComponent(name)

  const t = await getTranslations({ locale, namespace: 'tracking' })
  const tp = await getTranslations({ locale, namespace: 'progress' })

  // Fetch all non-archived orders
  const allOrders = await prisma.order.findMany({
    where: { archived: false },
  }) as unknown as Order[]

  // Filter case-insensitively in JS since SQLite LOWER() won't use index
  const matches = allOrders.filter(o => o.name.toLowerCase() === decodedName.toLowerCase())

  // 0 matches: not found
  if (matches.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            {t('backToOverview')}
          </Link>

          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold">{t('orderNotFound')}</h1>
              <p className="text-muted-foreground">{t('orderNotFoundDescription')}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Search className="h-4 w-4" />
                  {t('findOrder')}
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                >
                  <PlusCircle className="h-4 w-4" />
                  {t('createNew')}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Multiple matches: disambiguation
  if (matches.length > 1) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            {t('backToOverview')}
          </Link>

          <h1 className="text-2xl font-bold mb-2">{t('multipleOrders')}</h1>
          <p className="text-muted-foreground mb-6">{t('selectOrder')}</p>

          <div className="space-y-3">
            {matches.map((order) => {
              const status = getOrderStatus(order)
              const countryInfo = findCountryInfo(order.country)
              return (
                <Link
                  key={order.id}
                  href={`/track/${encodeURIComponent(order.name)}?id=${order.id}`}
                  className="block"
                >
                  <Card className="hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{order.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="default" className="text-xs">
                            {order.vehicleType === 'Model Y' ? 'MY' : 'M3'}
                          </Badge>
                          {order.model && (
                            <Badge variant="secondary" className="text-xs">{order.model}</Badge>
                          )}
                          {order.orderDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {order.orderDate}
                            </span>
                          )}
                          {countryInfo && (
                            <span className="text-xs text-muted-foreground">{countryInfo.flag} {countryInfo.label}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {order.deliveryDate ? (
                          <Badge variant="default" className="bg-green-600 text-white text-xs">
                            {order.deliveryDate}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {tp(status === 'delivery_scheduled' ? 'deliveryScheduled' : status === 'papers_received' ? 'papers' : status === 'vin_received' ? 'vinReceived' : 'ordered')}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Single match: full tracking view
  const order = matches[0]
  const colorInfo = findColorInfo(order.color)
  const countryInfo = findCountryInfo(order.country)
  const status = getOrderStatus(order)

  // Delivery prediction
  const prediction = predictDelivery(
    allOrders,
    order.vehicleType,
    order.model ?? undefined,
    order.country ?? undefined,
    order.drive ?? undefined,
    order.orderDate ?? undefined,
  )

  // Similar orders with progressive relaxation
  let similar = allOrders.filter(o =>
    o.vehicleType === order.vehicleType &&
    o.model === order.model &&
    o.deliveryDate &&
    o.id !== order.id
  ).slice(0, 8)

  if (similar.length < 3) {
    similar = allOrders.filter(o =>
      o.vehicleType === order.vehicleType &&
      o.drive === order.drive &&
      o.deliveryDate &&
      o.id !== order.id
    ).slice(0, 8)
  }

  // Percentile calculation for delivered orders
  let fasterPercent: number | null = null
  if (order.orderToDelivery != null) {
    const allDeliveryDays = allOrders
      .filter(o => o.orderToDelivery != null && o.vehicleType === order.vehicleType)
      .map(o => o.orderToDelivery as number)
      .sort((a, b) => a - b)

    if (allDeliveryDays.length > 0) {
      const rank = allDeliveryDays.filter(d => d > order.orderToDelivery!).length
      fasterPercent = Math.round((rank / allDeliveryDays.length) * 100)
    }
  }

  // Build detail fields
  const detailFields: { label: string; value: string | null }[] = [
    { label: t('orderDate'), value: order.orderDate },
    { label: t('vehicle'), value: order.vehicleType },
    { label: t('model'), value: order.model },
    { label: t('range'), value: order.range },
    { label: t('drive'), value: order.drive },
    { label: t('color'), value: order.color },
    { label: t('interior'), value: order.interior },
    { label: t('wheels'), value: order.wheels ? `${order.wheels}"` : null },
    { label: t('towHitch'), value: order.towHitch },
    { label: t('seats'), value: order.seats },
    { label: t('autopilot'), value: order.autopilot },
    { label: t('country'), value: countryInfo?.label || order.country },
    { label: t('deliveryWindow'), value: order.deliveryWindow },
    { label: t('deliveryLocation'), value: order.deliveryLocation },
    { label: t('vin'), value: order.vin },
    { label: t('vinReceived'), value: order.vinReceivedDate },
    { label: t('papersReceived'), value: order.papersReceivedDate },
    { label: t('productionDate'), value: order.productionDate },
    { label: t('typeApproval'), value: order.typeApproval },
    { label: t('typeVariant'), value: order.typeVariant },
    { label: t('delivered'), value: order.deliveryDate },
  ]

  // Duration stats
  const durationFields: { label: string; value: number | null }[] = [
    { label: t('orderToVin'), value: order.orderToVin },
    { label: t('orderToPapers'), value: order.orderToPapers },
    { label: t('orderToDelivery'), value: order.orderToDelivery },
    { label: t('papersToDelivery'), value: order.papersToDelivery },
  ]

  const predictionData = prediction ? {
    optimisticDays: prediction.optimisticDays,
    expectedDays: prediction.expectedDays,
    pessimisticDays: prediction.pessimisticDays,
    optimisticDate: prediction.optimisticDate,
    expectedDate: prediction.expectedDate,
    pessimisticDate: prediction.pessimisticDate,
    confidence: prediction.confidence,
    sampleSize: prediction.sampleSize,
    filtersUsed: prediction.filtersUsed,
  } : null

  return (
    <TrackingPageClient
      order={order}
      similar={similar}
      prediction={predictionData}
      fasterPercent={fasterPercent}
      detailFields={detailFields}
      durationFields={durationFields}
      colorInfo={colorInfo ? { hex: colorInfo.hex, border: colorInfo.border } : null}
      countryInfo={countryInfo ? { label: countryInfo.label, flag: countryInfo.flag } : null}
    />
  )
}
