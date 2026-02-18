import { OrderFormData, Order } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound } from 'lucide-react'

interface PasswordStepProps {
  formData: OrderFormData
  handleChange: (field: keyof OrderFormData, value: string | boolean) => void
  order?: Order | null
  isLegacy?: boolean
  newEditCode: string
  setNewEditCode: (value: string) => void
  confirmNewEditCode: string
  setConfirmNewEditCode: (value: string) => void
  t: (key: string) => string
}

export function PasswordStep({
  formData,
  handleChange,
  order,
  isLegacy,
  newEditCode,
  setNewEditCode,
  confirmNewEditCode,
  setConfirmNewEditCode,
  t,
}: PasswordStepProps) {
  // Legacy order: needs new password
  if (order && isLegacy) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-4">
          <h4 className="font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <KeyRound className="h-4 w-4" />
            {t('legacyPasswordTitle')}
          </h4>
          <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
            {t('legacyPasswordDescription')}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="newEditCode">{t('newPassword')} *</Label>
          <Input
            id="newEditCode"
            type="password"
            value={newEditCode}
            onChange={(e) => setNewEditCode(e.target.value)}
            placeholder={t('passwordPlaceholder')}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmNewEditCode">{t('confirmNewPassword')} *</Label>
          <Input
            id="confirmNewEditCode"
            type="password"
            value={confirmNewEditCode}
            onChange={(e) => setConfirmNewEditCode(e.target.value)}
            placeholder={t('confirmPasswordPlaceholder')}
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t('legacyPasswordHint')}
        </p>
      </div>
    )
  }

  // New order: password fields (always required)
  if (!order) {
    return (
      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          {t('password')}
        </h4>
        <p className="text-sm text-muted-foreground">
          {t('passwordDescription')}
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customPassword">{t('password')} *</Label>
            <Input
              id="customPassword"
              type="password"
              value={formData.customPassword}
              onChange={(e) => handleChange('customPassword', e.target.value)}
              placeholder={t('passwordPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirmPassword')} *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder={t('confirmPasswordPlaceholder')}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('passwordHint')}
          </p>
        </div>
      </div>
    )
  }

  return null
}
