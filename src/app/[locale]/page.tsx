'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { Order, Settings } from '@/lib/types'
import { groupOrdersByQuarter } from '@/lib/groupOrders'
import { CollapsibleOrderSection } from '@/components/CollapsibleOrderSection'
import { TostFieldsModal } from '@/components/TostFieldsModal'
import { OrderSearch } from '@/components/OrderSearch'
import { EditCodeModal } from '@/components/EditCodeModal'
import { PasswordPromptModal } from '@/components/PasswordPromptModal'
import { CommunityPulse } from '@/components/CommunityPulse'
import { HeroSection } from '@/components/HeroSection'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, RefreshCw, Car, BarChart3, Copy, Check, KeyRound, ChevronUp } from 'lucide-react'
import { Link } from '@/i18n/navigation'

export default function Home() {
  const t = useTranslations('home')
  const tc = useTranslations('common')
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

  const orderGroups = useMemo(() => groupOrdersByQuarter(orders), [orders])

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders')
      const data = await res.json()
      setOrders(data)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    }
  }, [])

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
    fetchOrders()
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
        fetchOrders()
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

  const handleSearchSelect = useCallback((orderId: string, quarterLabel: string) => {
    // Expand the target quarter, keeping already-open ones
    setExpandedQuarters(prev => {
      return prev.includes(quarterLabel) ? prev : [...prev, quarterLabel]
    })
    setHighlightOrderId(orderId)

    // Poll for the visible element (both mobile cards and desktop rows share the
    // same data-order-id; querySelector returns the first DOM match which is the
    // mobile card — hidden on desktop. Pick the one that's actually visible.)
    let attempts = 0
    const tryScroll = () => {
      const els = document.querySelectorAll(`[data-order-id="${orderId}"]`)
      const visible = Array.from(els).find(el => (el as HTMLElement).offsetParent !== null)
      if (visible) {
        visible.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => setHighlightOrderId(null), 3000)
      } else if (attempts < 30) {
        attempts++
        requestAnimationFrame(tryScroll)
      }
    }
    requestAnimationFrame(tryScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header
        isAdmin={isAdmin}
        settings={settings}
        onSearchOpen={() => setShowSearch(true)}
      />

      <main className="w-full max-w-[98vw] mx-auto px-4 py-6 space-y-8">
        {/* Hero Section */}
        <HeroSection onSearchOpen={() => setShowSearch(true)} />

        {/* Community Pulse */}
        <CommunityPulse />

        <div className="flex items-center justify-between">
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
        </div>

        {showStats && !loading && (
          <>
            {/* Delivery Prediction */}
            <DeliveryPrediction orders={orders} />
            <StatisticsDashboard orders={orders} />
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
                  {t('ordersCount', { count: orders.length })}
                  {orderGroups.length > 0 && ` ${t('quartersCount', { count: orderGroups.length })}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={fetchOrders} className="text-muted-foreground">
                  <RefreshCw className="h-4 w-4 mr-2" />
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
          onSuccess={fetchOrders}
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
          fetchOrders()
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
            fetchOrders()
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
