'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { Order, Settings, VehicleType } from '@/lib/types'
import { filterOrdersByPeriod } from '@/lib/statistics'
import { groupOrdersByQuarter } from '@/lib/groupOrders'
import { useOptions } from '@/hooks/useOptions'
import { GlobalFilterBar, GlobalFilters, defaultGlobalFilters, keyToPeriod } from '@/components/GlobalFilterBar'
import { CollapsibleOrderSection } from '@/components/CollapsibleOrderSection'
import { TostFieldsModal } from '@/components/TostFieldsModal'
import { OrderSearch } from '@/components/OrderSearch'
import { EditCodeModal } from '@/components/EditCodeModal'
import { PasswordPromptModal } from '@/components/PasswordPromptModal'
// CommunityPulse removed — its metrics are now in the Overview stats tab
import { HeroSection } from '@/components/HeroSection'
import { VeteransList } from '@/components/VeteransList'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/ui/button'

const StatisticsDashboard = dynamic(
  () => import('@/components/statistics/StatisticsDashboard').then(mod => mod.StatisticsDashboard),
  { ssr: false }
)
const DeliveryPrediction = dynamic(
  () => import('@/components/statistics/DeliveryPrediction').then(mod => mod.DeliveryPrediction),
  { ssr: false }
)
const OrderForm = dynamic(
  () => import('@/components/OrderForm').then(mod => mod.OrderForm)
)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, RefreshCw, Car, BarChart3, Copy, Check, KeyRound, ChevronUp, Calculator, Medal } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from '@/i18n/navigation'

export default function Home() {
  const t = useTranslations('home')
  const tc = useTranslations('common')
  const tp = useTranslations('prediction')
  const [orders, setOrders] = useState<Order[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditCodeModal, setShowEditCodeModal] = useState(false)
  const [newEditCode, setNewEditCode] = useState('')
  const [isCustomPassword, setIsCustomPassword] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [editByCodeOrder, setEditByCodeOrder] = useState<Order | null>(null)
  const [editByCodePassword, setEditByCodePassword] = useState('')
  const [editByCodeIsLegacy, setEditByCodeIsLegacy] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [tostFieldsOrder, setTostFieldsOrder] = useState<Order | null>(null)
  const [showStats, setShowStats] = useState(true)
  const [showPrediction, setShowPrediction] = useState(false)
  // Search state
  const [showSearch, setShowSearch] = useState(false)
  const [expandedQuarters, setExpandedQuarters] = useState<string[]>([])
  const [accordionInitialized, setAccordionInitialized] = useState(false)
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null)
  // Reset code dialog state
  const [resetCodeDialog, setResetCodeDialog] = useState<{
    open: boolean
    code: string
    orderName: string
  }>({ open: false, code: '', orderName: '' })
  const [resetCodeCopied, setResetCodeCopied] = useState(false)
  const [generatingResetCode, setGeneratingResetCode] = useState(false)

  // Hoist options fetch — shared by all OrderTable instances
  const { options: tableOptions } = useOptions()

  // Global filters
  const GLOBAL_FILTERS_KEY = 'tesla-tracker-filters'
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>(defaultGlobalFilters)
  const [filtersHydrated, setFiltersHydrated] = useState(false)

  // Load global filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(GLOBAL_FILTERS_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Reconstruct period from serialized form
        if (parsed.periodKey) {
          parsed.period = keyToPeriod(parsed.periodKey)
          delete parsed.periodKey
        }
        setGlobalFilters({ ...defaultGlobalFilters, ...parsed })
      } catch { /* ignore */ }
    }
    setFiltersHydrated(true)
  }, [])

  // Save global filters to localStorage
  useEffect(() => {
    if (filtersHydrated) {
      // Serialize period as a string key for localStorage
      const periodKey = globalFilters.period.type === 'all' ? 'all'
        : globalFilters.period.type === 'year' ? `year-${globalFilters.period.year}`
        : `quarter-${globalFilters.period.year}-${globalFilters.period.quarter}`
      const toSave = { ...globalFilters, period: undefined, periodKey }
      localStorage.setItem(GLOBAL_FILTERS_KEY, JSON.stringify(toSave))
    }
  }, [globalFilters, filtersHydrated])

  // Apply global filters to orders in a single pass
  const filteredOrders = useMemo(() => {
    const { vehicle, model, range, color, drive, wheels, interior, country, deliveryLocation, period } = globalFilters
    const hasVehicle = vehicle !== 'all'
    const hasPeriod = period.type !== 'all'

    // If no filters active, apply only period filter (which may need its own logic)
    if (!hasVehicle && !hasPeriod && !model && !range && !color && !drive && !wheels && !interior && !country && !deliveryLocation) {
      return orders
    }

    // Apply period filter separately since it has complex logic, then single-pass the rest
    const periodFiltered = hasPeriod ? filterOrdersByPeriod(orders, period) : orders

    if (!hasVehicle && !model && !range && !color && !drive && !wheels && !interior && !country && !deliveryLocation) {
      return periodFiltered
    }

    return periodFiltered.filter(o =>
      (!hasVehicle || o.vehicleType === vehicle) &&
      (!model || o.model === model) &&
      (!range || o.range === range) &&
      (!color || o.color === color) &&
      (!drive || o.drive === drive) &&
      (!wheels || o.wheels === wheels) &&
      (!interior || o.interior === interior) &&
      (!country || o.country === country) &&
      (!deliveryLocation || o.deliveryLocation === deliveryLocation)
    )
  }, [orders, globalFilters])

  const orderGroups = useMemo(() => groupOrdersByQuarter(filteredOrders), [filteredOrders])
  const hasActiveGlobalFilters = globalFilters.vehicle !== 'all' || globalFilters.period.type !== 'all' || globalFilters.model !== '' || globalFilters.range !== '' || globalFilters.color !== '' || globalFilters.drive !== '' || globalFilters.wheels !== '' || globalFilters.interior !== '' || globalFilters.country !== '' || globalFilters.deliveryLocation !== ''

  const [refreshing, setRefreshing] = useState(false)
  const ordersFingerprint = useRef('')

  const fetchOrders = useCallback(async (showToast = false, skipFingerprintCheck = false) => {
    if (showToast) setRefreshing(true)
    try {
      const res = await fetch('/api/orders')
      const data = await res.json()
      // Build lightweight fingerprint to skip unnecessary re-renders on auto-refresh
      const fp = data.length + '-' + (data[0]?.updatedAt ?? '') + '-' + (data[data.length - 1]?.updatedAt ?? '')
      if (!showToast && !skipFingerprintCheck && fp === ordersFingerprint.current) {
        return // Data unchanged, skip state update
      }
      ordersFingerprint.current = fp
      setOrders(data)
      if (showToast) toast.success(tc('ordersRefreshed', { count: data.length }))
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      if (showToast) toast.error(tc('refreshError'))
    } finally {
      if (showToast) setRefreshing(false)
    }
  }, [tc])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setSettings(data)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }, [])

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/check')
      const data = await res.json()
      setIsAdmin(data.authenticated)
    } catch {
      setIsAdmin(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchOrders(), fetchSettings(), checkAuth()]).finally(() => {
      setLoading(false)
    })
  }, [fetchOrders, fetchSettings, checkAuth])

  // Initialize accordion with first group open once orders load
  useEffect(() => {
    if (!accordionInitialized && orderGroups.length > 0) {
      setExpandedQuarters([orderGroups[0].label])
      setAccordionInitialized(true)
    }
  }, [orderGroups, accordionInitialized])

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const handleOrderSuccess = () => {
    setIsCustomPassword(true)
    setNewEditCode('')
    setShowEditCodeModal(true)
    fetchOrders(false, true)
  }

  const handleEditByCode = useCallback((order: Order) => {
    setEditByCodeOrder(order)
  }, [])

  const handleEditByCodeVerified = useCallback((order: Order, password: string, isLegacy: boolean) => {
    setEditByCodeOrder(null)
    setEditByCodePassword(password)
    setEditByCodeIsLegacy(isLegacy)
    setEditingOrder(order)
  }, [])

  const handleEdit = (order: Order) => {
    setEditingOrder(order)
  }

  const handleDelete = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders?id=${orderId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchOrders(false, true)
      }
    } catch (error) {
      console.error('Failed to delete order:', error)
    }
    setDeleteConfirm(null)
  }

  const handleDeliveryUpdate = useCallback((hadDeliveryBefore: boolean, hasDeliveryNow: boolean) => {
    if (!hadDeliveryBefore && hasDeliveryNow) {
      import('@/components/DeliveryCelebration').then(mod => mod.triggerCelebration())
    }
  }, [])

  const handleGenerateResetCode = useCallback(async (orderId: string, orderName: string) => {
    setGeneratingResetCode(true)
    try {
      const res = await fetch('/api/orders/reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || t('errorGeneratingCode'))
      }
      setResetCodeDialog({
        open: true,
        code: data.resetCode,
        orderName: orderName,
      })
    } catch (error) {
      console.error('Failed to generate reset code:', error)
      alert(error instanceof Error ? error.message : t('errorGeneratingCode'))
    } finally {
      setGeneratingResetCode(false)
    }
  }, [t])

  const [scrollToOrderId, setScrollToOrderId] = useState<string | null>(null)

  const handleSearchSelect = useCallback((orderId: string, quarterLabel: string) => {
    // Expand the target quarter, keeping already-open ones
    setExpandedQuarters(prev => {
      return prev.includes(quarterLabel) ? prev : [...prev, quarterLabel]
    })
    setHighlightOrderId(orderId)

    // Wait for accordion to expand, then scroll the section into view and trigger virtualizer scroll
    requestAnimationFrame(() => {
      // Find the accordion section by its trigger text
      const triggers = document.querySelectorAll('[data-state="open"]')
      const section = Array.from(triggers).find(el => el.textContent?.includes(quarterLabel))
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }

      // Trigger virtualizer scroll after section is visible
      setTimeout(() => setScrollToOrderId(orderId), 300)
    })

    // Clear highlight after animation
    setTimeout(() => setHighlightOrderId(null), 3000)
    // Clear scroll target after virtualizer has scrolled
    setTimeout(() => setScrollToOrderId(null), 1000)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header
        isAdmin={isAdmin}
        settings={settings}
      />

      <main className="w-full max-w-[98vw] mx-auto px-4 py-6 space-y-8">
        {/* Hero Section */}
        <HeroSection onSearchOpen={() => setShowSearch(true)} />


        {/* Global Filter Bar */}
        {!loading && (
          <GlobalFilterBar
            orders={orders}
            filters={globalFilters}
            onChange={setGlobalFilters}
          />
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            {showStats ? t('hideStats') : t('showStats')}
            <ChevronUp className={`h-4 w-4 transition-transform duration-200 ${showStats ? '' : 'rotate-180'}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrediction(true)}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            {tp('title')}
          </Button>
        </div>

        {showStats && !loading && (
          <>
            <StatisticsDashboard
              orders={filteredOrders}
              selectedPeriod={globalFilters.period}
              selectedVehicle={globalFilters.vehicle}
            />
            <Collapsible>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Medal className="h-4 w-4 text-yellow-500" />
                      {t('veterans')}
                      <ChevronUp className="h-4 w-4 ml-auto transition-transform duration-200 [[data-state=closed]_&]:rotate-180" />
                    </CardTitle>
                    <CardDescription>{t('veteransDescription')}</CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <VeteransList orders={orders} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </>
        )}

        {/* Section Divider */}
        <div className="relative flex items-center py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('orders')}</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Orders Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  {t('orders')}
                </CardTitle>
                <CardDescription>
                  {hasActiveGlobalFilters
                    ? `${filteredOrders.length} von ${orders.length} ${t('orders')}`
                    : t('ordersCount', { count: orders.length })}
                  {orderGroups.length > 0 && ` ${t('quartersCount', { count: orderGroups.length })}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => fetchOrders(true)} disabled={refreshing} className="text-muted-foreground">
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{tc('refresh')}</span>
                </Button>
                <Button size="sm" onClick={() => setShowAddForm(true)} className="shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{t('newOrder')}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full animate-shimmer" />
                <Skeleton className="h-16 w-full animate-shimmer" />
                <Skeleton className="h-16 w-full animate-shimmer" />
              </div>
            ) : (
              <CollapsibleOrderSection
                groups={orderGroups}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteConfirm(id)}
                onGenerateResetCode={isAdmin ? handleGenerateResetCode : undefined}
                onEditByCode={!isAdmin ? handleEditByCode : undefined}
                onEditTostFields={setTostFieldsOrder}
                expandedQuarters={expandedQuarters}
                onExpandedChange={setExpandedQuarters}
                highlightOrderId={highlightOrderId}
                options={tableOptions}
                scrollToOrderId={scrollToOrderId}
              />
            )}
          </CardContent>
        </Card>
      </main>

      <Footer
        settings={settings}
        orderCount={orders.length}
        deliveredCount={orders.filter(o => o.deliveryDate).length}
      />

      {/* Delivery Prediction Dialog */}
      <Dialog open={showPrediction} onOpenChange={setShowPrediction}>
        <DialogContent className="sm:max-w-2xl lg:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              {tp('title')}
            </DialogTitle>
            <DialogDescription>{tp('description')}</DialogDescription>
          </DialogHeader>
          <DeliveryPrediction orders={filteredOrders} />
        </DialogContent>
      </Dialog>

      {/* Order Search */}
      <OrderSearch
        open={showSearch}
        onOpenChange={setShowSearch}
        orders={orders}
        orderGroups={orderGroups}
        onSelectOrder={handleSearchSelect}
      />

      {/* Modals */}
      <OrderForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSuccess={handleOrderSuccess}
      />

      <EditCodeModal
        open={showEditCodeModal}
        onOpenChange={setShowEditCodeModal}
        editCode={newEditCode}
        isCustomPassword={isCustomPassword}
      />

      {editByCodeOrder && (
        <PasswordPromptModal
          open={!!editByCodeOrder}
          onOpenChange={(open) => !open && setEditByCodeOrder(null)}
          order={editByCodeOrder}
          onVerified={handleEditByCodeVerified}
          onSuccess={() => fetchOrders(false, true)}
        />
      )}

      <TostFieldsModal
        order={tostFieldsOrder}
        onClose={() => setTostFieldsOrder(null)}
        onSave={async (orderId, data) => {
          const res = await fetch('/api/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: orderId, ...data }),
          })
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Fehler beim Speichern')
          }
          fetchOrders(false, true)
        }}
      />

      {editingOrder && (
        <OrderForm
          open={!!editingOrder}
          onOpenChange={(open) => {
            if (!open) {
              setEditingOrder(null)
              setEditByCodePassword('')
              setEditByCodeIsLegacy(false)
            }
          }}
          order={editingOrder}
          editCode={editByCodePassword || undefined}
          isLegacy={editByCodeIsLegacy || undefined}
          onSuccess={() => {
            setEditingOrder(null)
            setEditByCodePassword('')
            setEditByCodeIsLegacy(false)
            fetchOrders(false, true)
          }}
        />
      )}

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              {tc('delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Code Dialog */}
      <Dialog open={resetCodeDialog.open} onOpenChange={(open) => !open && setResetCodeDialog({ ...resetCodeDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {t('resetCodeTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('resetCodeDescription', { name: resetCodeDialog.orderName })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={resetCodeDialog.code}
                className="flex-1 text-2xl font-mono text-center tracking-widest bg-muted px-4 py-3 rounded-md border"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(resetCodeDialog.code)
                  setResetCodeCopied(true)
                  setTimeout(() => setResetCodeCopied(false), 2000)
                }}
                title={tc('copy')}
              >
                {resetCodeCopied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-sm text-amber-700 dark:text-amber-400">
              <p className="font-medium">{t('resetCodeImportant')}</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>{t('resetCodeShareInfo')}</li>
                <li>{t('resetCodeSetPassword')}</li>
                <li>{t('resetCodeOneTime')}</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setResetCodeDialog({ ...resetCodeDialog, open: false })}>
              {tc('close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
