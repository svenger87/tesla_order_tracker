'use client'

import { useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Order, VehicleType } from '@/lib/types'
import { calculateStatistics, StatsPeriod } from '@/lib/statistics'
import { StatCard } from './StatCard'
import { CountryDistributionChart } from './CountryDistributionChart'
import { OrdersTimelineChart } from './OrdersTimelineChart'
import { DeliveryTimelineChart } from './DeliveryTimelineChart'
import { WaitTimeDistributionChart } from './WaitTimeDistributionChart'
import { VinWeekdayChart } from './VinWeekdayChart'
import { MiniPieChart } from './ConfigDistributionCharts'
import { EmptyState } from '@/components/EmptyState'
import { DeliveryTrendChart } from './DeliveryTrendChart'
import { ConfigDeliveryInsights } from './ConfigDeliveryInsights'
import { VinActivityChart } from './VinActivityChart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Car,
  CheckCircle2,
  Timer,
  FileText,
  TrendingUp,
  BarChart3,
  Globe,
  Calendar,
  AlertCircle,
  Settings2,
  Hourglass,
  Package,
  Zap,
  MapPin,
  Users,
  Link2,
} from 'lucide-react'

interface StatisticsDashboardProps {
  orders: Order[]          // already filtered by global filters
  selectedPeriod: StatsPeriod
  selectedVehicle: VehicleType | 'all'
}

export function StatisticsDashboard({ orders, selectedPeriod, selectedVehicle }: StatisticsDashboardProps) {
  const t = useTranslations('statistics')
  const tc = useTranslations('common')
  const tcd = useTranslations('countryDelivery')

  const tabsRef = useRef<HTMLDivElement>(null)

  const stats = useMemo(
    () => calculateStatistics(orders, selectedPeriod, selectedVehicle === 'all' ? undefined : selectedVehicle),
    [orders, selectedPeriod, selectedVehicle]
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Warning for orders without valid dates */}
      {stats.ordersWithoutDate > 0 && (
        <div className="flex">
          <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('withoutValidDate', { count: stats.ordersWithoutDate })}
          </Badge>
        </div>
      )}

      {/* Main Statistics Tabs */}
      <Tabs defaultValue="overview" className="w-full" ref={tabsRef} onValueChange={() => {
        setTimeout(() => {
          tabsRef.current?.querySelector('[role="tabpanel"]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 50)
      }}>
        <TabsList className="sticky-tabs flex w-full overflow-x-auto flex-nowrap gap-1 sm:grid sm:grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2.5 whitespace-nowrap">
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{t('overviewShort')}</span>
            <span className="hidden sm:inline">{t('overview')}</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2.5 whitespace-nowrap">
            <Car className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{t('configurationShort')}</span>
            <span className="hidden sm:inline">{t('configuration')}</span>
          </TabsTrigger>
          <TabsTrigger value="ausstattung" className="flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2.5 whitespace-nowrap">
            <Settings2 className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{t('equipmentShort')}</span>
            <span className="hidden sm:inline">{t('equipment')}</span>
          </TabsTrigger>
          <TabsTrigger value="geo" className="flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2.5 whitespace-nowrap">
            <Globe className="h-4 w-4 shrink-0" />
            <span>{t('geo')}</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2.5 whitespace-nowrap">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{t('timelineShort')}</span>
            <span className="hidden sm:inline">{t('timeline')}</span>
          </TabsTrigger>
          <TabsTrigger value="speed" className="flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2.5 whitespace-nowrap">
            <Zap className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{t('speedShort')}</span>
            <span className="hidden sm:inline">{t('speed')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="mt-6 space-y-5">
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {stats.totalOrders === 0 ? (
              <EmptyState
                icon={BarChart3}
                title={t('noData')}
                description={t('noDataAvailable')}
                action={undefined}
              />
            ) : (
              <div className="space-y-5">
                {/* Hero row: Total + Delivered */}
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    label={t('total')}
                    value={stats.totalOrders}
                    icon={Car}
                    description={t('orders')}
                    hint={t('hintTotal')}
                    variant="hero"
                    semanticColor="data"
                    delay={0}
                    watermark
                  />
                  <StatCard
                    label={t('delivered')}
                    value={stats.deliveredOrders}
                    icon={CheckCircle2}
                    description={`${stats.totalOrders > 0 ? Math.round((stats.deliveredOrders / stats.totalOrders) * 100) : 0}%`}
                    hint={t('hintDelivered')}
                    variant="hero"
                    semanticColor="success"
                    delay={0.1}
                    watermark
                  />
                </div>

                {/* Secondary row: remaining 6 cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatCard
                    label={t('pending')}
                    value={stats.pendingOrders}
                    icon={Package}
                    description={t('waitingForDelivery')}
                    hint={t('hintPending')}
                    semanticColor="pending"
                    minimal
                    delay={0.2}
                  />
                  <StatCard
                    label={t('avgDeliveryTime')}
                    value={stats.avgOrderToDelivery !== null ? `${stats.avgOrderToDelivery} ${tc('days')}` : '-'}
                    icon={Timer}
                    hint={t('hintAvgDelivery')}
                    semanticColor="data"
                    minimal
                    delay={0.3}
                  />
                  <StatCard
                    label={t('avgOrderToVin')}
                    value={stats.avgOrderToVin !== null ? `${stats.avgOrderToVin} ${tc('days')}` : '-'}
                    icon={Clock}
                    hint={t('hintAvgVin')}
                    semanticColor="data"
                    minimal
                    delay={0.4}
                  />
                  <StatCard
                    label={t('avgOrderToPapers')}
                    value={stats.avgOrderToPapers !== null ? `${stats.avgOrderToPapers} ${tc('days')}` : '-'}
                    icon={FileText}
                    hint={stats.avgOrderToPapers === null
                      ? t('hintAvgPapersNull')
                      : t('hintAvgPapers')}
                    semanticColor="data"
                    minimal
                    delay={0.5}
                  />
                  <StatCard
                    label={t('avgPapersToDelivery')}
                    value={stats.avgPapersToDelivery !== null ? `${stats.avgPapersToDelivery} ${tc('days')}` : '-'}
                    icon={TrendingUp}
                    hint={t('hintPapersToDelivery')}
                    semanticColor="data"
                    minimal
                    delay={0.6}
                  />
                  <StatCard
                    label={t('deliveryRate')}
                    value={`${stats.totalOrders > 0 ? Math.round((stats.deliveredOrders / stats.totalOrders) * 100) : 0}%`}
                    icon={CheckCircle2}
                    description={t('ofTotal', { delivered: stats.deliveredOrders, total: stats.totalOrders })}
                    hint={t('hintDeliveryRate')}
                    semanticColor="success"
                    minimal
                    delay={0.7}
                  />
                  <StatCard
                    label={t('manualOrders')}
                    value={stats.manualOrders}
                    icon={Users}
                    description={`${stats.totalOrders > 0 ? Math.round((stats.manualOrders / stats.totalOrders) * 100) : 0}%`}
                    hint={t('hintManualOrders')}
                    semanticColor="data"
                    minimal
                    delay={0.8}
                  />
                  <StatCard
                    label={t('tostOrders')}
                    value={stats.tostOrders}
                    icon={Link2}
                    description={`${stats.totalOrders > 0 ? Math.round((stats.tostOrders / stats.totalOrders) * 100) : 0}%`}
                    hint={t('hintTostOrders')}
                    semanticColor="data"
                    minimal
                    delay={0.9}
                  />
                  <StatCard
                    label={t('vinsThisWeek')}
                    value={stats.vinsThisWeek}
                    icon={Zap}
                    semanticColor="pending"
                    minimal
                    delay={1.0}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* Tab 2: Konfiguration - Modell, Antrieb, Reichweite, Farbe */}
        <TabsContent value="config" className="mt-6">
          <motion.div
            key="config"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MiniPieChart data={stats.modelDistribution} title={t('modelDistribution')} delay={0} />
              <MiniPieChart data={stats.driveDistribution} title={t('driveDistribution')} delay={0.05} />
              <MiniPieChart data={stats.rangeDistribution} title={t('rangeDistribution')} delay={0.1} />
              <MiniPieChart data={stats.colorDistribution} title={t('colorDistribution')} delay={0.15} />
            </div>
          </motion.div>
        </TabsContent>

        {/* Tab 3: Ausstattung - Innenraum, Felgen, AHK, Autopilot */}
        <TabsContent value="ausstattung" className="mt-6">
          <motion.div
            key="ausstattung"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MiniPieChart data={stats.interiorDistribution} title={t('interiorDistribution')} delay={0} />
              <MiniPieChart data={stats.wheelsDistribution} title={t('wheelsDistribution')} delay={0.05} />
              <MiniPieChart data={stats.towHitchDistribution} title={t('towHitchDistribution')} delay={0.1} />
              <MiniPieChart data={stats.seatsDistribution} title={t('seatsDistribution')} delay={0.15} />
              <MiniPieChart data={stats.autopilotDistribution} title={t('autopilotDistribution')} delay={0.2} />
            </div>
          </motion.div>
        </TabsContent>

        {/* Tab 4: Geodaten - Laender, Lieferorte */}
        <TabsContent value="geo" className="mt-6">
          <motion.div
            key="geo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="relative shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <div className="rounded-lg bg-primary/10 p-1.5">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    {t('countryDistribution')}
                  </CardTitle>
                  <CardDescription>{t('topCountries')}</CardDescription>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
                  <CountryDistributionChart data={stats.countryDistribution} />
                </CardContent>
                <span className="absolute bottom-2 right-3 text-[9px] opacity-[0.15] text-foreground select-none pointer-events-none">tff-order-stats.de</span>
              </Card>
              <Card className="relative shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <div className="rounded-lg bg-primary/10 p-1.5">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    {t('deliveryLocations')}
                  </CardTitle>
                  <CardDescription>{t('topLocations')}</CardDescription>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
                  <CountryDistributionChart data={stats.deliveryLocationDistribution.slice(0, 10)} />
                </CardContent>
                <span className="absolute bottom-2 right-3 text-[9px] opacity-[0.15] text-foreground select-none pointer-events-none">tff-order-stats.de</span>
              </Card>
            </div>

            {/* Country delivery speed ranking */}
            {stats.countryDeliveryStats.length > 0 && (() => {
              const total = stats.countryDeliveryStats.length
              return (
                <Card className="relative shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow mt-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <div className="rounded-lg bg-primary/10 p-1.5">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      {tcd('title')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>{tcd('country')}</TableHead>
                          <TableHead className="text-right tabular-nums">{tcd('avgWait')}</TableHead>
                          <TableHead className="text-right tabular-nums">{tcd('medianWait')}</TableHead>
                          <TableHead className="text-right tabular-nums">{tcd('orders')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.countryDeliveryStats.map((row, i) => (
                          <TableRow key={row.country} style={{ borderLeft: `3px solid oklch(${0.55 + (i / total) * 0.15} ${0.16 - (i / total) * 0.06} ${145 - (i / total) * 70})` }}>
                            <TableCell className="font-medium tabular-nums">
                              {i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : i + 1}
                            </TableCell>
                            <TableCell>{row.country}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.avgDays}d</TableCell>
                            <TableCell className="text-right tabular-nums font-medium">{row.medianDays}d</TableCell>
                            <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                  <span className="absolute bottom-2 right-3 text-[9px] opacity-[0.15] text-foreground select-none pointer-events-none">tff-order-stats.de</span>
                </Card>
              )
            })()}
          </motion.div>
        </TabsContent>

        {/* Tab 5: Timeline & Wait Times */}
        <TabsContent value="timeline" className="mt-6 space-y-8">
          <motion.div
            key="timeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Delivery Trend Radar */}
            <DeliveryTrendChart orders={orders} />

            {/* Timeline charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="relative shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <div className="rounded-lg bg-primary/10 p-1.5">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    {t('ordersOverTime')}
                  </CardTitle>
                  <CardDescription>{t('ordersPerMonth')}</CardDescription>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
                  <OrdersTimelineChart data={stats.ordersOverTime} />
                </CardContent>
                <span className="absolute bottom-2 right-3 text-[9px] opacity-[0.15] text-foreground select-none pointer-events-none">tff-order-stats.de</span>
              </Card>

              <Card className="relative shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <div className="rounded-lg bg-green-500/10 p-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    {t('deliveriesOverTime')}
                  </CardTitle>
                  <CardDescription>{t('deliveriesPerMonth')}</CardDescription>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
                  <DeliveryTimelineChart data={stats.deliveriesOverTime} />
                </CardContent>
                <span className="absolute bottom-2 right-3 text-[9px] opacity-[0.15] text-foreground select-none pointer-events-none">tff-order-stats.de</span>
              </Card>
            </div>

            {/* VIN weekday distribution */}
            <Card className="relative shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <div className="rounded-lg bg-primary/10 p-1.5">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  {t('vinWeekday')}
                </CardTitle>
                <CardDescription>{t('vinWeekdayDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
                <VinWeekdayChart data={stats.vinWeekdayDistribution} />
              </CardContent>
              <span className="absolute bottom-2 right-3 text-[9px] opacity-[0.15] text-foreground select-none pointer-events-none">tff-order-stats.de</span>
            </Card>

            {/* VIN Activity */}
            <VinActivityChart orders={orders} />

            {/* Wait time distribution */}
            <Card className="relative shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <div className="rounded-lg bg-primary/10 p-1.5">
                    <Hourglass className="h-4 w-4 text-primary" />
                  </div>
                  {t('waitTimeDistribution')}
                </CardTitle>
                <CardDescription>{t('waitTimeDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
                <WaitTimeDistributionChart data={stats.waitTimeDistribution} />
              </CardContent>
              <span className="absolute bottom-2 right-3 text-[9px] opacity-[0.15] text-foreground select-none pointer-events-none">tff-order-stats.de</span>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Tab 6: Speed - Config Delivery Insights */}
        <TabsContent value="speed" className="mt-6">
          <motion.div
            key="speed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="relative shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <div className="rounded-lg bg-blue-500/10 p-1.5">
                    <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  {t('speed')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0">
                <ConfigDeliveryInsights orders={orders} />
              </CardContent>
              <span className="absolute bottom-2 right-3 text-[9px] opacity-[0.15] text-foreground select-none pointer-events-none">tff-order-stats.de</span>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
