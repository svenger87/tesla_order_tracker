'use client'

import { OrderFormData } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Ban } from 'lucide-react'

interface CancellationStepProps {
  formData: OrderFormData
  handleChange: (field: keyof OrderFormData, value: string | boolean) => void
  t: (key: string) => string
}

/**
 * Flagging an order as cancelled.
 *
 * This lived only inside the desktop form's JSX, so on a phone — where the form
 * is a wizard built from these step components — there was no way to reach it
 * at all. Half the visitors could not mark their own order cancelled. Sharing
 * the control is what stops that happening again.
 *
 * Edit mode only: a new order is never born cancelled.
 */
export function CancellationStep({ formData, handleChange, t }: CancellationStepProps) {
  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border p-4 transition-colors',
        formData.cancelled ? 'border-destructive/40 bg-destructive/5' : 'surface-subtle',
      )}
    >
      <h4 className="flex items-center gap-2 border-b pb-2 text-sm font-semibold">
        <Ban className={cn('h-4 w-4', formData.cancelled ? 'text-destructive' : 'text-muted-foreground')} />
        {t('cancelledTitle')}
      </h4>
      <p className="text-sm text-muted-foreground">{t('cancelledDescription')}</p>
      <div className="flex items-center gap-3">
        <Checkbox
          id="cancelled"
          checked={!!formData.cancelled}
          onCheckedChange={(v) => handleChange('cancelled', v === true)}
        />
        <Label htmlFor="cancelled" className="cursor-pointer text-sm font-medium">
          {t('cancelledLabel')}
        </Label>
      </div>
      {formData.cancelled && <p className="text-xs text-muted-foreground">{t('cancelledHint')}</p>}
    </div>
  )
}
