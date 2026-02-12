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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
      setError('Bitte gib den Einmalcode ein')
      setLoading(false)
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwörter stimmen nicht überein')
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein')
      setLoading(false)
      return
    }

    if (!/\d/.test(newPassword)) {
      setError('Passwort muss mindestens eine Zahl enthalten')
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
        throw new Error(data.error || 'Fehler beim Zurücksetzen des Passworts')
      }

      setResetSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Zurücksetzen des Passworts')
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
          <DialogTitle>Bestellung bearbeiten</DialogTitle>
          <DialogDescription>
            Gib deinen Zugangsdaten ein, um deine Bestellung zu ändern.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Bearbeiten</TabsTrigger>
            <TabsTrigger value="reset">
              <KeyRound className="h-3 w-3 mr-1" />
              Passwort vergessen
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
          </TabsContent>

          <TabsContent value="reset" className="mt-4">
            {resetSuccess ? (
              <div className="space-y-4">
                <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-3 rounded-md text-sm">
                  <p className="font-medium">Passwort erfolgreich geändert!</p>
                  <p className="mt-1">
                    Du kannst dich jetzt mit deinem neuen Passwort anmelden.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleClose}>Schließen</Button>
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
                    Wenn du einen Einmalcode vom Admin erhalten hast, kannst du hier ein neues Passwort setzen.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resetCode">Einmalcode (6 Ziffern)</Label>
                  <Input
                    id="resetCode"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="font-mono text-lg tracking-widest text-center"
                    maxLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Neues Passwort</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mindestens 6 Zeichen, eine Zahl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Passwort bestätigen</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Passwort wiederholen"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={loading || resetCode.length !== 6}>
                    {loading ? 'Speichern...' : 'Passwort ändern'}
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
