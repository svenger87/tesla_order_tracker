'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { Order } from '@/lib/types'
import { filterOrdersByPeriod } from '@/lib/statistics'
import { groupOrdersByQuarter } from '@/lib/groupOrders'
import { useOptions } from '@/hooks/useOptions'
import { GlobalFilterBar, GlobalFilters, defaultGlobalFilters, keyToPeriod } from '@/components/GlobalFilterBar'
import { CollapsibleOrderSection } from '@/components/CollapsibleOrderSection'
import { TostFieldsModal } from '@/components/TostFieldsModal'
import { OrderSearch } from '@/components/OrderSearch'
import { EditCodeModal } from '@/components/EditCodeModal'
import { PasswordPromptModal } from '@/components/PasswordPromptModal'
import { useApiError } from '@/hooks/useApiError'
import { HeroSection } from '@/components/HeroSection'
import { VeteransList } from '@/components/VeteransList'
import { UpdatesFeed } from '@/components/UpdatesFeed'
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
import { RefreshCw, Car, Copy, Check, KeyRound, ChevronUp, Calculator, Medal } from 'lucide-react'
import { toast } from 'sonner'

interface HomeClientProps {
  initialOrders: Order[]
}

export function HomeClient({ initialOrders }: HomeClientProps) {
  const t = useTranslations('home')
  const tc = useTranslations('common')
  const tp = useTranslations('prediction')
  const tv = useTranslations('form.validation')
  const apiError = useApiError()
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [isAdmin, setIsAdmin] = useState(false)
  // Orders arrive with the HTML, so there is no initial loading
  // state left to show — the refresh path has its own spinner.
  const loading = false
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
  const STATS_OPEN_KEY_DESKTOP = 'tesla-tracker-stats-open-v3-desktop'
  const STATS_OPEN_KEY_MOBILE = 'tesla-tracker-stats-open-v3-mobile'
  const [showStats, setShowStats] = useState<boolean>(true)
  const [statsHydrated, setStatsHydrated] = useState(false)
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

  // Load stats panel open state from localStorage
  useEffect(() => {
    let raw: string | null = null
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    const key = isMobile ? STATS_OPEN_KEY_MOBILE : STATS_OPEN_KEY_DESKTOP
    try {
      raw = localStorage.getItem(key)
    } catch {}
    if (raw !== null) setShowStats(raw === 'true')
    else setShowStats(!isMobile)
    setStatsHydrated(true)
  }, [])

  // Save stats panel open state to localStorage
  useEffect(() => {
    if (!statsHydrated) return
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    const key = isMobile ? STATS_OPEN_KEY_MOBILE : STATS_OPEN_KEY_DESKTOP
    try { localStorage.setItem(key, String(showStats)) } catch {}
  }, [showStats, statsHydrated])

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

  const orderGroups = useMemo(() => groupOrdersByQuarter(filteredOrders, tc('noDate')), [filteredOrders, tc])

  // Cancelled orders stay in `filteredOrders` so the table's own chip can reveal
  // them, but nothing that computes an average may see them.
  const liveOrders = useMemo(() => filteredOrders.filter(o => !o.cancelled), [filteredOrders])
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
    checkAuth()
  }, [checkAuth])

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
      } else {
        // A failed delete used to be entirely silent: the row stayed where it
        // was with no explanation, which reads as "the button does nothing".
        const data = await res.json().catch(() => null)
        toast.error(data?.error || tc('deleteError'))
      }
    } catch (error) {
      console.error('Failed to delete order:', error)
      toast.error(tc('deleteError'))
    }
    setDeleteConfirm(null)
  }

  const handleGenerateResetCode = useCallback(async (orderId: string, orderName: string) => {
    try {
      const res = await fetch('/api/orders/reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(apiError(data, t('errorGeneratingCode')))
      }
      setResetCodeDialog({
        open: true,
        code: data.resetCode,
        orderName: orderName,
      })
    } catch (error) {
      console.error('Failed to generate reset code:', error)
      toast.error(error instanceof Error ? error.message : t('errorGeneratingCode'))
    }
  }, [t, apiError])

  const [scrollToOrderId, setScrollToOrderId] = useState<string | null>(null)
  const [searchTarget, setSearchTarget] = useState<{ orderId: string; quarterLabel: string } | null>(null)

  const handleSearchSelect = useCallback((orderId: string, quarterLabel: string) => {
    // Expand the target quarter, keeping already-open ones (quarter label already known from search result)
    setExpandedQuarters(prev => {
      return prev.includes(quarterLabel) ? prev : [...prev, quarterLabel]
    })
    setHighlightOrderId(orderId)
    setSearchTarget({ orderId, quarterLabel })

    setTimeout(() => setHighlightOrderId(null), 3000)
  }, [])

  /**
   * Scroll to the order the search landed on, once its quarter is on screen.
   *
   * This ran in a requestAnimationFrame fired straight after asking React to
   * expand the quarter, so it raced the render that creates the section — and
   * it located that section by scanning every element with `data-state="open"`
   * for one whose text contained the quarter label. That attribute is on any
   * open Radix component: a dropdown, a tooltip, the filter popover. An effect
   * runs after the commit, and the quarter now carries its own attribute.
   */
  useEffect(() => {
    if (!searchTarget) return

    const section = document.querySelector(
      `[data-quarter="${CSS.escape(searchTarget.quarterLabel)}"]`
    )
    // On phones the quarters are one flat table, so there is no section to
    // scroll to — scrollToOrderId still takes the view to the row itself.
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setSearchTarget(null)

    // Let the quarter finish opening before pointing the table at the row.
    const toRow = setTimeout(() => setScrollToOrderId(searchTarget.orderId), 300)
    const clear = setTimeout(() => setScrollToOrderId(null), 1300)
    return () => {
      clearTimeout(toRow)
      clearTimeout(clear)
    }
  }, [searchTarget])

  return (
    <div>
      {/* Header and footer moved into SiteShell, which the layout wraps around
          every page — they used to exist only here, so this was the one page in
          the app with navigation. */}
      <div className="w-full px-3 py-3 space-y-3 sm:px-4 sm:py-6 sm:space-y-5 lg:px-5 2xl:px-6">
        {/* Hero Section */}
        <HeroSection orders={orders} onSearchOpen={() => setShowSearch(true)} onNewOrder={() => setShowAddForm(true)} />

        {/* Global Filter Bar */}
        {!loading && (
          <GlobalFilterBar
            orders={orders}
            filters={globalFilters}
            onChange={setGlobalFilters}
          />
        )}


        {/* The disclosure sits on the thing it discloses. It used to be a
            full-width bordered card containing one button, directly above the
            card it toggled. */}
        <section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => setShowStats(!showStats)}
              className="flex min-w-0 items-center gap-3 text-left"
              aria-expanded={showStats}
            >
              <ChevronUp className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${showStats ? '' : 'rotate-180'}`} />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-kicker">{t('statsTitle')}</span>
                <span className="block truncate text-base font-semibold tracking-tight">{t('statsSubtitle')}</span>
              </span>
            </button>
            {showStats && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrediction(true)}
                className="hidden shrink-0 gap-2 sm:inline-flex"
              >
                <Calculator className="h-4 w-4" />
                {tp('title')}
              </Button>
            )}
          </div>
          {showStats && !loading && (
            <div className="border-t">
              <div className="px-3 py-3 sm:px-4">
                <div className="space-y-4">
                  <StatisticsDashboard
                    orders={filteredOrders}
                    selectedPeriod={globalFilters.period}
                    selectedVehicle={globalFilters.vehicle}
                  />
                  <Collapsible>
                    <Card className="overflow-hidden shadow-none">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="pb-2 cursor-pointer hover:surface-subtle transition-colors rounded-t-xl">
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
                          <VeteransList orders={orders.filter(o => !o.cancelled)} />
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Orders Section */}
        <Card className="overflow-hidden border-0 bg-transparent shadow-none sm:border sm:bg-card sm:shadow-[var(--shadow-card)]">
          <CardHeader className="border-b bg-transparent px-0 pb-2 pt-0 sm:bg-card sm:px-4 sm:py-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                {/* h2, not CardTitle: the quarter accordions below render as h3
                    (Radix puts its trigger in one), so with only a div here the
                    page jumped from the hero h1 straight to h3. Same classes, so
                    nothing moves. */}
                <h2 className="flex items-center gap-2 text-[22px] font-semibold leading-none sm:text-xl" data-slot="card-title">
                  <Car className="h-5 w-5 text-primary" />
                  {t('orders')}
                </h2>
                <CardDescription className="text-sm">
                  {hasActiveGlobalFilters
                    ? `${liveOrders.length} / ${orders.filter(o => !o.cancelled).length} ${t('orders')}`
                    : t('ordersCount', { count: orders.filter(o => !o.cancelled).length })}
                  {orderGroups.length > 0 && ` ${t('quartersCount', { count: orderGroups.length })}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => fetchOrders(true)} disabled={refreshing} className="text-muted-foreground">
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {/* Below sm the label is hidden, which left the button with no
                      name at all on exactly the devices that never show a title
                      tooltip. sr-only keeps it named once the text goes away. */}
                  <span className="hidden sm:inline">{tc('refresh')}</span>
                  <span className="sr-only sm:hidden">{tc('refresh')}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-4">
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

        {/* Updates Feed */}
        <UpdatesFeed
          globalFilters={{
            countries: globalFilters.country ? [globalFilters.country] : [],
            vehicleType: globalFilters.vehicle ?? 'all',
          }}
        />
      </div>

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
          <DeliveryPrediction orders={liveOrders} />
        </DialogContent>
      </Dialog>

      {/* Order Search */}
      <OrderSearch
        open={showSearch}
        onOpenChange={setShowSearch}
        orderGroups={orderGroups}
        onSelectOrder={handleSearchSelect}
        options={tableOptions}
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
            throw new Error(apiError(err, tv('saveError')))
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
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="sr-only">{tc('copy')}</span>
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
