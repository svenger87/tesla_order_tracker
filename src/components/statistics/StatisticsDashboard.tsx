'use client'

import { useMemo, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Order, VehicleType, VEHICLE_TYPES } from '@/lib/types'
import { calculateStatistics, getAvailablePeriods, StatsPeriod } from '@/lib/statistics'
import { StatCard } from './StatCard'
import { CountryDistributionChart } from './CountryDistributionChart'
import { OrdersTimelineChart } from './OrdersTimelineChart'
import { DeliveryTimelineChart } from './DeliveryTimelineChart'
import { WaitTimeDistributionChart } from './WaitTimeDistributionChart'
import { MiniPieChart } from './ConfigDistributionCharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
} from 'lucide-react'

interface StatisticsDashboardProps {
  orders: Order[]
}

// Convert period to string key for select
function periodToKey(period: StatsPeriod): string {
  if (period.type === 'all') return 'all'
  if (period.type === 'year') return `year-${period.year}`
  if (period.type === 'quarter') return `quarter-${period.year}-${period.quarter}`
  return 'all'
}

// Convert string key back to period
function keyToPeriod(key: string): StatsPeriod {
  if (key === 'all') return { type: 'all' }
  if (key.startsWith('year-')) {
    const year = parseInt(key.split('-')[1])
    return { type: 'year', year }
  }
  if (key.startsWith('quarter-')) {
    const parts = key.split('-')
    return { type: 'quarter', year: parseInt(parts[1]), quarter: parseInt(parts[2]) }
  }
  return { type: 'all' }
}

// Format quarter label
function formatQuarter(year: number, quarter: number): string {
  return `Q${quarter} ${year}`
}

const PERIOD_STORAGE_KEY = 'tesla-tracker-stats-period'
const VEHICLE_STORAGE_KEY = 'tesla-tracker-stats-vehicle'

export function StatisticsDashboard({ orders }: StatisticsDashboardProps) {
  const t = useTranslations('statistics')
  const tc = useTranslations('common')
  const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>({ type: 'all' })
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | 'all'>('all')
  const [isHydrated, setIsHydrated] = useState(false)

  // Load from localStorage after hydration
  useEffect(() => {
    const savedPeriod = localStorage.getItem(PERIOD_STORAGE_KEY)
    if (savedPeriod) {
      setSelectedPeriod(keyToPeriod(savedPeriod))
    }
    const savedVehicle = localStorage.getItem(VEHICLE_STORAGE_KEY)
    if (savedVehicle && (savedVehicle === 'all' || savedVehicle === 'Model Y' || savedVehicle === 'Model 3')) {
      setSelectedVehicle(savedVehicle)
    }
    setIsHydrated(true)
  }, [])

  // Save to localStorage whenever period or vehicle changes (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(PERIOD_STORAGE_KEY, periodToKey(selectedPeriod))
      localStorage.setItem(VEHICLE_STORAGE_KEY, selectedVehicle)
    }
  }, [selectedPeriod, selectedVehicle, isHydrated])

  const availablePeriods = useMemo(() => getAvailablePeriods(orders), [orders])
  const stats = useMemo(
    () => calculateStatistics(orders, selectedPeriod, selectedVehicle === 'all' ? undefined : selectedVehicle),
    [orders, selectedPeriod, selectedVehicle]
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Filter Bar - Only applies to charts */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Vehicle Type Selector */}
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-muted-foreground hidden sm:block" />
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline">{t('vehicle')}:</span>
            <Select
              value={selectedVehicle}
              onValueChange={(value) => setSelectedVehicle(value as VehicleType | 'all')}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t('vehicleSelect')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc('all')}</SelectItem>
                {VEHICLE_TYPES.map((vt) => (
                  <SelectItem key={vt.value} value={vt.value}>
                    {vt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground hidden sm:block" />
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline">{t('period')}:</span>
            <Select
              value={periodToKey(selectedPeriod)}
              onValueChange={(key) => setSelectedPeriod(keyToPeriod(key))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('periodSelect')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTime')}</SelectItem>
                {availablePeriods.years.length > 0 && (
                  <>
                    {availablePeriods.years.map((year) => (
                      <SelectItem key={`year-${year}`} value={`year-${year}`}>
                        {t('year', { year })}
                      </SelectItem>
                    ))}
                  </>
                )}
                {availablePeriods.quarters.length > 0 && (
                  <>
                    {availablePeriods.quarters.map(({ year, quarter }) => (
                      <SelectItem
                        key={`quarter-${year}-${quarter}`}
                        value={`quarter-${year}-${quarter}`}
                      >
                        {formatQuarter(year, quarter)}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

          {/* Warning for orders without valid dates */}
          {stats.ordersWithoutDate > 0 && (
            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
              <AlertCircle className="h-3 w-3 mr-1" />
              {t('withoutValidDate', { count: stats.ordersWithoutDate })}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('filterNote')}
        </p>
      </div>

      {/* Main Statistics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 gap-1">
          <TabsTrigger value="overview" className="flex items-center gap-1 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{t('overviewShort')}</span>
            <span className="hidden sm:inline">{t('overview')}</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-1 text-xs sm:text-sm">
            <Car className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{t('configurationShort')}</span>
            <span className="hidden sm:inline">{t('configuration')}</span>
          </TabsTrigger>
          <TabsTrigger value="ausstattung" className="flex items-center gap-1 text-xs sm:text-sm">
            <Settings2 className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{t('equipmentShort')}</span>
            <span className="hidden sm:inline">{t('equipment')}</span>
          </TabsTrigger>
          <TabsTrigger value="geo" className="flex items-center gap-1 text-xs sm:text-sm">
            <Globe className="h-4 w-4 shrink-0" />
            <span>{t('geo')}</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1 text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{t('timelineShort')}</span>
            <span className="hidden sm:inline">{t('timeline')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="mt-6 space-y-4">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label={t('total')}
              value={stats.totalOrders}
              icon={Car}
              description={t('orders')}
              hint={t('hintTotal')}
              variant="hero"
              delay={0}
            />
            <StatCard
              label={t('delivered')}
              value={stats.deliveredOrders}
              icon={CheckCircle2}
              description={`${stats.totalOrders > 0 ? Math.round((stats.deliveredOrders / stats.totalOrders) * 100) : 0}%`}
              hint={t('hintDelivered')}
              variant="hero"
              delay={0.1}
            />
            <StatCard
              label={t('pending')}
              value={stats.pendingOrders}
              icon={Package}
              description={t('waitingForDelivery')}
              hint={t('hintPending')}
              delay={0.2}
            />
            <StatCard
              label={t('avgDeliveryTime')}
              value={stats.avgOrderToDelivery !== null ? `${stats.avgOrderToDelivery} ${tc('days')}` : '-'}
              icon={Timer}
              hint={t('hintAvgDelivery')}
              delay={0.3}
            />
          </div>

          {/* Additional Time Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label={t('avgOrderToVin')}
              value={stats.avgOrderToVin !== null ? `${stats.avgOrderToVin} ${tc('days')}` : '-'}
              icon={Clock}
              hint={t('hintAvgVin')}
              delay={0.4}
            />
            <StatCard
              label={t('avgOrderToPapers')}
              value={stats.avgOrderToPapers !== null ? `${stats.avgOrderToPapers} ${tc('days')}` : '-'}
              icon={FileText}
              hint={stats.avgOrderToPapers === null
                ? t('hintAvgPapersNull')
                : t('hintAvgPapers')}
              delay={0.5}
            />
            <StatCard
              label={t('avgPapersToDelivery')}
              value={stats.avgPapersToDelivery !== null ? `${stats.avgPapersToDelivery} ${tc('days')}` : '-'}
              icon={TrendingUp}
              hint={t('hintPapersToDelivery')}
              delay={0.6}
            />
            <StatCard
              label={t('deliveryRate')}
              value={`${stats.totalOrders > 0 ? Math.round((stats.deliveredOrders / stats.totalOrders) * 100) : 0}%`}
              icon={CheckCircle2}
              description={t('ofTotal', { delivered: stats.deliveredOrders, total: stats.totalOrders })}
              hint={t('hintDeliveryRate')}
              delay={0.7}
            />
          </div>
        </TabsContent>

        {/* Tab 2: Konfiguration - Modell, Antrieb, Reichweite, Farbe */}
        <TabsContent value="config" className="mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniPieChart data={stats.modelDistribution} title={t('modelDistribution')} delay={0} />
            <MiniPieChart data={stats.driveDistribution} title={t('driveDistribution')} delay={0.05} />
            <MiniPieChart data={stats.rangeDistribution} title={t('rangeDistribution')} delay={0.1} />
            <MiniPieChart data={stats.colorDistribution} title={t('colorDistribution')} delay={0.15} />
          </div>
        </TabsContent>

        {/* Tab 3: Ausstattung - Innenraum, Felgen, AHK, Autopilot */}
        <TabsContent value="ausstattung" className="mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniPieChart data={stats.interiorDistribution} title={t('interiorDistribution')} delay={0} />
            <MiniPieChart data={stats.wheelsDistribution} title={t('wheelsDistribution')} delay={0.05} />
            <MiniPieChart data={stats.towHitchDistribution} title={t('towHitchDistribution')} delay={0.1} />
            <MiniPieChart data={stats.autopilotDistribution} title={t('autopilotDistribution')} delay={0.15} />
          </div>
        </TabsContent>

        {/* Tab 4: Geodaten - Länder, Lieferorte */}
        <TabsContent value="geo" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5 text-primary" />
                  {t('countryDistribution')}
                </CardTitle>
                <CardDescription>{t('topCountries')}</CardDescription>
              </CardHeader>
              <CardContent>
                <CountryDistributionChart data={stats.countryDistribution} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-primary" />
                  {t('deliveryLocations')}
                </CardTitle>
                <CardDescription>{t('topLocations')}</CardDescription>
              </CardHeader>
              <CardContent>
                <CountryDistributionChart data={stats.deliveryLocationDistribution.slice(0, 10)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 5: Timeline & Wait Times */}
        <TabsContent value="timeline" className="mt-6 space-y-6">
          {/* Timeline charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {t('ordersOverTime')}
                </CardTitle>
                <CardDescription>{t('ordersPerMonth')}</CardDescription>
              </CardHeader>
              <CardContent>
                <OrdersTimelineChart data={stats.ordersOverTime} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  {t('deliveriesOverTime')}
                </CardTitle>
                <CardDescription>{t('deliveriesPerMonth')}</CardDescription>
              </CardHeader>
              <CardContent>
                <DeliveryTimelineChart data={stats.deliveriesOverTime} />
              </CardContent>
            </Card>
          </div>

          {/* Wait time distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Hourglass className="h-5 w-5 text-primary" />
                {t('waitTimeDistribution')}
              </CardTitle>
              <CardDescription>{t('waitTimeDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <WaitTimeDistributionChart data={stats.waitTimeDistribution} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
