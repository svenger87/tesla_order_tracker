'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { Order, Settings } from '@/lib/types'
import { groupOrdersByQuarter } from '@/lib/groupOrders'
import { CollapsibleOrderSection } from '@/components/CollapsibleOrderSection'
import { OrderSearch } from '@/components/OrderSearch'
import { EditCodeModal } from '@/components/EditCodeModal'
import { DonationBanner } from '@/components/DonationBanner'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/button'

const StatisticsDashboard = dynamic(
  () => import('@/components/statistics/StatisticsDashboard').then(mod => mod.StatisticsDashboard),
  { ssr: false }
)
const OrderForm = dynamic(
  () => import('@/components/OrderForm').then(mod => mod.OrderForm)
)
const EditByCodeModal = dynamic(
  () => import('@/components/EditByCodeModal').then(mod => mod.EditByCodeModal)
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
import { Plus, Pencil, LogIn, RefreshCw, Car, BarChart3, Coffee, Github, Code2, Copy, Check, KeyRound, MoreHorizontal, ChevronUp, Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'

export default function Home() {
  const t = useTranslations('home')
  const tc = useTranslations('common')
  const ts = useTranslations('search')
  const [orders, setOrders] = useState<Order[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditCodeModal, setShowEditCodeModal] = useState(false)
  const [showEditByCode, setShowEditByCode] = useState(false)
  const [newEditCode, setNewEditCode] = useState('')
  const [isCustomPassword, setIsCustomPassword] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
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

  const handleOrderSuccess = (editCode?: string) => {
    // If no editCode is passed, user chose a custom password
    // If editCode is passed, it was auto-generated
    setIsCustomPassword(!editCode)
    setNewEditCode(editCode || '')
    setShowEditCodeModal(true)
    fetchOrders()
  }

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

    // Poll for the element to appear in the DOM (accordion may still be animating)
    let attempts = 0
    const tryScroll = () => {
      const el = document.querySelector(`[data-order-id="${orderId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Clear highlight after 3 seconds
        setTimeout(() => setHighlightOrderId(null), 3000)
      } else if (attempts < 20) {
        attempts++
        requestAnimationFrame(tryScroll)
      }
    }
    requestAnimationFrame(tryScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg"
      >
        <div className="h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
        <div className="w-full max-w-[98vw] mx-auto px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="relative rounded-lg bg-primary p-1.5 w-[38px] h-[44px] transition-transform hover:scale-105"
              >
                <Image
                  src="/logo.webp"
                  alt="Tesla Tracker Logo"
                  fill
                  sizes="44px"
                  className="object-contain p-0.5"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold md:text-2xl">
                  <span className="sm:hidden">{t('titleShort')}</span>
                  <span className="hidden sm:inline">{t('title')}</span>
                </h1>
                <p className="hidden text-sm text-muted-foreground sm:block">
                  {t('subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Desktop nav items */}
              {settings?.showDonation && settings?.donationUrl && (
                <a
                  href={settings.donationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                >
                  <Coffee className="h-3.5 w-3.5" />
                  <span>{tc('support')}</span>
                </a>
              )}
              <Link href="/docs" className="hidden sm:inline-flex">
                <Button variant="ghost" size="icon" className="h-9 w-9" title="API Docs">
                  <Code2 className="h-4 w-4" />
                  <span className="sr-only">API Docs</span>
                </Button>
              </Link>
              <a
                href="https://github.com/svenger87/tesla_order_tracker"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex"
              >
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Github className="h-4 w-4" />
                  <span className="sr-only">GitHub</span>
                </Button>
              </a>
              {/* Desktop search button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSearch(true)}
                className="hidden sm:inline-flex gap-2 text-muted-foreground"
              >
                <Search className="h-4 w-4" />
                {ts('openSearch')}
                <kbd className="pointer-events-none ml-1 hidden h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
              {/* Mobile search button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSearch(true)}
                className="sm:hidden h-9 w-9"
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">{ts('openSearch')}</span>
              </Button>
              <LanguageSwitcher />
              <ThemeToggle />
              {/* Mobile overflow menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="sm:hidden">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">{tc('menu')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/docs">
                      <Code2 className="mr-2 h-4 w-4" />
                      API Docs
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href="https://github.com/svenger87/tesla_order_tracker"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="mr-2 h-4 w-4" />
                      GitHub
                    </a>
                  </DropdownMenuItem>
                  {settings?.showDonation && settings?.donationUrl && (
                    <DropdownMenuItem asChild>
                      <a
                        href={settings.donationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Coffee className="mr-2 h-4 w-4" />
                        {tc('support')}
                      </a>
                    </DropdownMenuItem>
                  )}
                  {isAdmin ? (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <LogIn className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/login">
                        <LogIn className="mr-2 h-4 w-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Desktop admin button */}
              {isAdmin ? (
                <Link href="/admin" className="hidden sm:inline-flex">
                  <Button variant="outline" size="sm">
                    Admin Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/admin/login" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm">
                    <LogIn className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[98vw] mx-auto px-4 py-6 space-y-8">
        {/* Statistics Toggle & Dashboard */}
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
          <StatisticsDashboard orders={orders} />
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
                <Button variant="outline" size="sm" onClick={() => setShowEditByCode(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{tc('edit')}</span>
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
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <CollapsibleOrderSection
                groups={orderGroups}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteConfirm(id)}
                onGenerateResetCode={isAdmin ? handleGenerateResetCode : undefined}
                expandedQuarters={expandedQuarters}
                onExpandedChange={setExpandedQuarters}
                highlightOrderId={highlightOrderId}
              />
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="w-full max-w-[98vw] mx-auto px-4 py-6 sm:py-8">
          <div
            className="flex flex-col items-center gap-4"
          >
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-muted-foreground">
              <a
                href="https://github.com/svenger87/tesla_order_tracker"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Github className="h-4 w-4" />
                <span>GitHub</span>
              </a>
              <Link
                href="/docs"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Code2 className="h-4 w-4" />
                <span>API Docs</span>
              </Link>
              <Link
                href="/impressum"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                Impressum
              </Link>
              {settings?.showDonation && (
                <DonationBanner settings={settings} />
              )}
            </div>
            <p className="text-xs text-muted-foreground/60">
              {t('footer')}
            </p>
          </div>
        </div>
      </footer>

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

      <EditByCodeModal
        open={showEditByCode}
        onOpenChange={setShowEditByCode}
        orders={orders}
        onSuccess={fetchOrders}
      />

      {editingOrder && (
        <OrderForm
          open={!!editingOrder}
          onOpenChange={(open) => !open && setEditingOrder(null)}
          order={editingOrder}
          onSuccess={() => {
            const hadDelivery = !!editingOrder.deliveryDate
            setEditingOrder(null)
            fetchOrders().then(() => {
              // Check if delivery was just added
            })
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
