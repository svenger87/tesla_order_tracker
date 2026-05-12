'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Order } from '@/lib/types'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TostFieldsModalProps {
  order: Order | null
  onClose: () => void
  onSave: (orderId: string, data: { orderDate?: string; papersReceivedDate?: string; productionDate?: string; typeApproval?: string; typeVariant?: string }) => Promise<void>
}

export function TostFieldsModal({ order, onClose, onSave }: TostFieldsModalProps) {
  const t = useTranslations('table')
  const tc = useTranslations('common')

  const [orderDate, setOrderDate] = useState(order?.orderDate || '')
  const [papersReceivedDate, setPapersReceivedDate] = useState(order?.papersReceivedDate || '')
  const [productionDate, setProductionDate] = useState(order?.productionDate || '')
  const [typeApproval, setTypeApproval] = useState(order?.typeApproval || '')
  const [typeVariant, setTypeVariant] = useState(order?.typeVariant || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync state when a different order is opened
  useEffect(() => {
    if (order) {
      setOrderDate(order.orderDate || '')
      setPapersReceivedDate(order.papersReceivedDate || '')
      setProductionDate(order.productionDate || '')
      setTypeApproval(order.typeApproval || '')
      setTypeVariant(order.typeVariant || '')
      setError(null)
    }
  }, [order])

  if (!order) return null

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const data: Record<string, string> = {}
      if (orderDate !== (order.orderDate || '')) data.orderDate = orderDate
      if (papersReceivedDate !== (order.papersReceivedDate || '')) data.papersReceivedDate = papersReceivedDate
      if (productionDate !== (order.productionDate || '')) data.productionDate = productionDate
      if (typeApproval !== (order.typeApproval || '')) data.typeApproval = typeApproval
      if (typeVariant !== (order.typeVariant || '')) data.typeVariant = typeVariant

      if (Object.keys(data).length === 0) {
        onClose()
        return
      }

      await onSave(order.id, data)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!order} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogTitle>{order.name} — {t('editTostFields')}</DialogTitle>
        <DialogDescription>
          {t('editTostFieldsDescription')}
        </DialogDescription>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="orderDate">{t('orderDate')}</Label>
            <Input
              id="orderDate"
              placeholder="TT.MM.JJJJ"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="papersReceivedDate">{t('papersReceivedDate')}</Label>
            <Input
              id="papersReceivedDate"
              placeholder="TT.MM.JJJJ"
              value={papersReceivedDate}
              onChange={(e) => setPapersReceivedDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="productionDate">{t('productionDate')}</Label>
            <Input
              id="productionDate"
              placeholder="TT.MM.JJJJ"
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="typeApproval">{t('typeApproval')}</Label>
            <Input
              id="typeApproval"
              value={typeApproval}
              onChange={(e) => setTypeApproval(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="typeVariant">{t('typeVariant')}</Label>
            <Input
              id="typeVariant"
              value={typeVariant}
              onChange={(e) => setTypeVariant(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '...' : tc('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
