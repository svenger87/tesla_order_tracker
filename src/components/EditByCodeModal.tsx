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
import { AlertCircle } from 'lucide-react'
import { OrderForm } from './OrderForm'

interface EditByCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: Order[]
  onSuccess: () => void
}

export function EditByCodeModal({ open, onOpenChange, orders, onSuccess }: EditByCodeModalProps) {
  const [editCode, setEditCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [foundOrder, setFoundOrder] = useState<Order | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [isLegacy, setIsLegacy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!editCode.trim()) {
      setError('Bitte gib deinen Bearbeitungscode/Passwort oder Benutzernamen ein')
      setLoading(false)
      return
    }

    try {
      // Verify the edit code by trying to find the order
      const res = await fetch(`/api/orders/verify?editCode=${encodeURIComponent(editCode)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Ungültiger Code')
      }

      // Find the order in the local list
      const order = orders.find(o => o.id === data.orderId)
      if (!order) {
        throw new Error('Bestellung nicht gefunden')
      }

      setFoundOrder(order)
      setIsLegacy(data.isLegacy || false)
      setShowEditForm(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Überprüfen des Codes')
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
    onOpenChange(false)
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
          <DialogTitle>Bestellung bearbeiten</DialogTitle>
          <DialogDescription>
            Gib deinen Zugangsdaten ein, um deine Bestellung zu ändern.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="editCode">Bearbeitungscode/Passwort oder Benutzername</Label>
            <Input
              id="editCode"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              placeholder="Code/Passwort oder Benutzername"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              <Badge variant="outline" className="mr-1 text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Bestandseinträge
              </Badge>
              Wenn dein Eintrag aus der alten Tabelle stammt, nutze deinen Benutzernamen.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Überprüfen...' : 'Weiter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
