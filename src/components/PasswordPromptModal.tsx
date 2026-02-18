'use client'

import { useState, useEffect } from 'react'
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
import { AlertCircle, ChevronDown, Info, KeyRound, User } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface PasswordPromptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order
  onVerified: (order: Order, editCode: string, isLegacy: boolean) => void
  onSuccess: () => void // for reset code flow
}

export function PasswordPromptModal({
  open,
  onOpenChange,
  order,
  onVerified,
  onSuccess,
}: PasswordPromptModalProps) {
  const t = useTranslations('editByCode')
  const tc = useTranslations('common')
  const tf = useTranslations('form')
  const tv = useTranslations('form.validation')

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)

  // Auth type detection
  const [authType, setAuthType] = useState<'loading' | 'password' | 'legacy'>('loading')

  // Reset code flow state
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  // Check auth type when modal opens
  useEffect(() => {
    if (!open) return
    setAuthType('loading')
    fetch(`/api/orders/verify?orderId=${encodeURIComponent(order.id)}&checkOnly=true`)
      .then(res => res.json())
      .then(data => {
        setAuthType(data.hasPassword ? 'password' : 'legacy')
      })
      .catch(() => {
        // Fallback: assume password (most common)
        setAuthType('password')
      })
  }, [open, order.id])

  const isLegacy = authType === 'legacy'

  const handleClose = () => {
    setPassword('')
    setError('')
    setShowReset(false)
    setResetCode('')
    setNewPassword('')
    setConfirmNewPassword('')
    setResetSuccess(false)
    setLoading(false)
    onOpenChange(false)
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password.trim()) {
      setError(isLegacy ? t('enterUsernamePrompt') : t('enterCodePrompt'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        `/api/orders/verify?editCode=${encodeURIComponent(password)}&orderId=${encodeURIComponent(order.id)}`
      )
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || t('invalidCode'))
      }

      onVerified(order, password, data.isLegacy || false)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verifyError'))
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!resetCode.trim()) {
      setError(t('enterResetCode'))
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError(tv('passwordMismatch'))
      return
    }

    if (newPassword.length < 6) {
      setError(t('passwordMinLength'))
      return
    }

    if (!/\d/.test(newPassword)) {
      setError(t('passwordNeedsNumber'))
      return
    }

    setLoading(true)
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
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('resetError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('passwordPromptTitle')}</DialogTitle>
          <DialogDescription>
            {isLegacy
              ? t('legacyPromptDescription', { name: order.name })
              : t('passwordPromptDescription', { name: order.name })}
          </DialogDescription>
        </DialogHeader>

        {/* Help box — adapted to auth type */}
        {authType !== 'loading' && (
          <div className={isLegacy
            ? "bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-sm text-amber-700 dark:text-amber-400"
            : "bg-blue-500/10 border border-blue-500/20 rounded-md p-3 text-sm text-blue-700 dark:text-blue-400"
          }>
            <div className="flex gap-2">
              {isLegacy
                ? <User className="h-4 w-4 shrink-0 mt-0.5" />
                : <Info className="h-4 w-4 shrink-0 mt-0.5" />
              }
              <p>{isLegacy ? t('legacyHelpDetailed') : t('passwordHelp')}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!showReset ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                {isLegacy ? t('usernameLabel') : tf('password')}
              </Label>
              <Input
                id="password"
                type={isLegacy ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLegacy ? t('usernamePlaceholder') : tf('passwordPlaceholder')}
                autoFocus
                disabled={authType === 'loading'}
              />
            </div>

            {!isLegacy && (
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <KeyRound className="h-3 w-3" />
                {t('forgotPassword')}
                <ChevronDown className="h-3 w-3" />
              </button>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={loading || authType === 'loading'}>
                {loading ? tc('checking') : tc('next')}
              </Button>
            </div>
          </form>
        ) : resetSuccess ? (
          <div className="space-y-4">
            <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-3 rounded-md text-sm">
              <p className="font-medium">{t('passwordChanged')}</p>
              <p className="mt-1">{t('passwordChangedDescription')}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>{tc('close')}</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-sm text-amber-700 dark:text-amber-400">
              {t('forgotPasswordHelp')}
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
              <Button type="button" variant="outline" onClick={() => { setShowReset(false); setError('') }}>
                {tc('back')}
              </Button>
              <Button type="submit" disabled={loading || resetCode.length !== 6}>
                {loading ? tc('saving') : t('changePassword')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
