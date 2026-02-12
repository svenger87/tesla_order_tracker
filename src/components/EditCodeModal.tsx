'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check, AlertTriangle, CheckCircle, KeyRound } from 'lucide-react'

interface EditCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editCode: string
  isCustomPassword?: boolean
}

export function EditCodeModal({ open, onOpenChange, editCode, isCustomPassword = false }: EditCodeModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Custom password confirmation modal
  if (isCustomPassword) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Bestellung erstellt!
            </DialogTitle>
            <DialogDescription>
              Dein Passwort wurde gespeichert.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <KeyRound className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Passwort gesichert
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Du kannst dein gewähltes Passwort zum Bearbeiten deiner Bestellung verwenden.
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Klicke auf &ldquo;Bearbeiten&rdquo; und gib dein Passwort ein, um deine Bestelldaten zu ändern.
            </p>

            <Button onClick={() => onOpenChange(false)} className="w-full">
              Alles klar!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Auto-generated code modal (existing behavior)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Bestellung erstellt!
          </DialogTitle>
          <DialogDescription>
            Speichere diesen Code, um deine Bestellung später bearbeiten zu können.
            <strong className="block mt-2 text-destructive">
              Dieser Code wird nur einmal angezeigt!
            </strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={editCode}
              readOnly
              className="font-mono text-center text-lg"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Mit diesem Code kannst du unter &ldquo;Bestellung bearbeiten&rdquo; deine Daten ändern.
          </p>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            Verstanden, Code gespeichert
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
