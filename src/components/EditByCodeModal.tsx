'use client'

import { useState } from 'react'
import { Order } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, KeyRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OrderForm } from './OrderForm'

interface EditByCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: Order[]
  onSuccess: () => void
}

export function EditByCodeModal({ open, onOpenChange, orders, onSuccess }: EditByCodeModalProps) {
  const t = useTranslations('editByCode')
  const tc = useTranslations('common')
  const tf = useTranslations('form')
  const tv = useTranslations('form.validation')
  const [editCode, setEditCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [foundOrder, setFoundOrder] = useState<Order | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [isLegacy, setIsLegacy] = useState(false)
  // Password reset with one-time code
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!editCode.trim()) {
      setError(t('enterCodePrompt'))
      setLoading(false)
      return
    }

    try {
      // Verify the edit code by trying to find the order
      const res = await fetch(`/api/orders/verify?editCode=${encodeURIComponent(editCode)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || t('invalidCode'))
      }

      // Find the order in the local list
      const order = orders.find(o => o.id === data.orderId)
      if (!order) {
        throw new Error(t('orderNotFound'))
      }

      setFoundOrder(order)
      setIsLegacy(data.isLegacy || false)
      setShowEditForm(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verifyError'))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEditCode('')
    setError('')
    setFoundOrder(null)
    setShowEditForm(false)
    setIsLegacy(false)
    setResetCode('')
    setNewPassword('')
    setConfirmNewPassword('')
    setResetSuccess(false)
    onOpenChange(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!resetCode.trim()) {
      setError(t('enterResetCode'))
      setLoading(false)
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError(tv('passwordMismatch'))
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError(t('passwordMinLength'))
      setLoading(false)
      return
    }

    if (!/\d/.test(newPassword)) {
      setError(t('passwordNeedsNumber'))
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/orders/use-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetCode: resetCode.trim(), newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || t('resetError'))
      }

      setResetSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('resetError'))
    } finally {
      setLoading(false)
    }
  }

  const handleEditSuccess = () => {
    handleClose()
    onSuccess()
  }

  if (showEditForm && foundOrder) {
    return (
      <OrderForm
        open={true}
        onOpenChange={(open) => {
          if (!open) handleClose()
        }}
        order={foundOrder}
        editCode={editCode}
        isLegacy={isLegacy}
        onSuccess={handleEditSuccess}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">{t('editTab')}</TabsTrigger>
            <TabsTrigger value="reset">
              <KeyRound className="h-3 w-3 mr-1" />
              {t('resetTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="editCode">{t('codeLabel')}</Label>
                <Input
                  id="editCode"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder={t('codePlaceholder')}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="mr-1 text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {t('legacyBadge')}
                  </Badge>
                  {t('legacyHint')}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? tc('checking') : tc('next')}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="reset" className="mt-4">
            {resetSuccess ? (
              <div className="space-y-4">
                <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-3 rounded-md text-sm">
                  <p className="font-medium">{t('passwordChanged')}</p>
                  <p className="mt-1">
                    {t('passwordChangedDescription')}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleClose}>{tc('close')}</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3 text-sm text-blue-700 dark:text-blue-400">
                  <p>
                    {t('resetInfo')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resetCode">{t('resetCodeLabel')}</Label>
                  <Input
                    id="resetCode"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder={t('resetCodePlaceholder')}
                    className="font-mono text-lg tracking-widest text-center"
                    maxLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('newPasswordLabel')}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={tf('passwordPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">{t('confirmPasswordLabel')}</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder={tf('confirmPasswordPlaceholder')}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    {tc('cancel')}
                  </Button>
                  <Button type="submit" disabled={loading || resetCode.length !== 6}>
                    {loading ? tc('saving') : t('changePassword')}
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
