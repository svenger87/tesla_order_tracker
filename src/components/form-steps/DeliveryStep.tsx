import { useId } from 'react'
import { OrderFormData } from '@/lib/types'
import { FormOption } from '@/hooks/useOptions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DeliveryStepProps {
  formData: OrderFormData
  handleChange: (field: keyof OrderFormData, value: string | boolean) => void
  deliveryLocations: FormOption[]
  t: (key: string) => string
  /** See PersonalDataStep — `contents` lets the desktop grid own these fields. */
  className?: string
}

export function DeliveryStep({
  formData,
  handleChange,
  deliveryLocations,
  t,
  className = 'space-y-4',
}: DeliveryStepProps) {
  const locationListId = useId()
  return (
    <div className={className}>
      <div className="space-y-2">
        <Label htmlFor="deliveryWindow">{t('deliveryWindow')}</Label>
        <Input
          id="deliveryWindow"
          value={formData.deliveryWindow}
          onChange={(e) => handleChange('deliveryWindow', e.target.value)}
          placeholder={t('deliveryWindowPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="deliveryLocation">{t('deliveryLocation')} *</Label>
        <Input
          id="deliveryLocation"
          list={locationListId}
          value={formData.deliveryLocation}
          onChange={(event) => handleChange('deliveryLocation', event.target.value)}
          placeholder={t('deliveryLocationSelect')}
        />
        <datalist id={locationListId}>
          {deliveryLocations.map(loc => (
            <option key={loc.value} value={loc.value} label={loc.label} />
          ))}
        </datalist>
      </div>
    </div>
  )
}
