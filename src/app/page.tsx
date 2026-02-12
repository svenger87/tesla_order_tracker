'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Order, Settings } from '@/lib/types'
import { groupOrdersByQuarter } from '@/lib/groupOrders'
import { StatisticsDashboard } from '@/components/statistics/StatisticsDashboard'
import { CollapsibleOrderSection } from '@/components/CollapsibleOrderSection'
import { OrderForm } from '@/components/OrderForm'
import { EditCodeModal } from '@/components/EditCodeModal'
import { EditByCodeModal } from '@/components/EditByCodeModal'
import { DonationBanner } from '@/components/DonationBanner'
import { ThemeToggle } from '@/components/ThemeToggle'
import { triggerCelebration } from '@/components/DeliveryCelebration'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, LogIn, RefreshCw, Car, BarChart3, Coffee } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
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

  const orderGroups = useMemo(() => groupOrdersByQuarter(orders), [orders])

  // Extract unique delivery locations for typeahead
  const existingLocations = useMemo(() => {
    const locations = orders
      .map(o => o.deliveryLocation)
      .filter((loc): loc is string => !!loc && loc.trim() !== '')
    return [...new Set(locations)].sort()
  }, [orders])

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
      triggerCelebration()
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg"
      >
        <div className="w-full max-w-[98vw] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative rounded-lg bg-primary p-1.5 w-[38px] h-[44px]"
              >
                <Image
                  src="/logo.webp"
                  alt="Tesla Tracker Logo"
                  fill
                  className="object-contain p-0.5"
                />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold md:text-2xl">Tesla Bestellungen und Statistiken</h1>
                <p className="hidden text-sm text-muted-foreground sm:block">
                  Verfolge Tesla Model Y Bestellungen
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {settings?.showDonation && settings?.donationUrl && (
                <a
                  href={settings.donationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                >
                  <Coffee className="h-3.5 w-3.5" />
                  <span>Unterstützen</span>
                </a>
              )}
              <ThemeToggle />
              {isAdmin ? (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    Admin Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/admin/login">
                  <Button variant="ghost" size="sm">
                    <LogIn className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      <main className="w-full max-w-[98vw] mx-auto px-4 py-6 space-y-6">
        {/* Statistics Toggle & Dashboard */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            {showStats ? 'Statistiken ausblenden' : 'Statistiken anzeigen'}
          </Button>
        </div>

        {showStats && !loading && (
          <StatisticsDashboard orders={orders} />
        )}

        {/* Orders Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  Bestellungen
                </CardTitle>
                <CardDescription>
                  {orders.length} {orders.length === 1 ? 'Bestellung' : 'Bestellungen'} insgesamt
                  {orderGroups.length > 0 && ` in ${orderGroups.length} ${orderGroups.length === 1 ? 'Quartal' : 'Quartalen'}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchOrders}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Aktualisieren</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowEditByCode(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Bearbeiten</span>
                </Button>
                <Button size="sm" onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Neue Bestellung</span>
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
              />
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="w-full max-w-[98vw] mx-auto px-4 py-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-muted-foreground"
          >
            <span>Tesla Bestellungen und Statistiken - Community Projekt</span>
            {settings?.showDonation && (
              <>
                <span className="hidden sm:inline">·</span>
                <DonationBanner settings={settings} />
              </>
            )}
          </motion.div>
        </div>
      </footer>

      {/* Modals */}
      <OrderForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSuccess={handleOrderSuccess}
        existingLocations={existingLocations}
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
        existingLocations={existingLocations}
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
              // This is a simplified check - in production you'd track the actual update
            })
          }}
          existingLocations={existingLocations}
        />
      )}

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bestellung löschen?</DialogTitle>
            <DialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Löschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
