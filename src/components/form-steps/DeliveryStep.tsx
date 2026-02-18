import { OrderFormData } from '@/lib/types'
import { FormOption } from '@/hooks/useOptions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DeliveryStepProps {
  formData: OrderFormData
  handleChange: (field: keyof OrderFormData, value: string | boolean) => void
  deliveryLocations: FormOption[]
  t: (key: string) => string
}

export function DeliveryStep({
  formData,
  handleChange,
  deliveryLocations,
  t,
}: DeliveryStepProps) {
  return (
    <div className="space-y-4">
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
        <Select value={formData.deliveryLocation} onValueChange={(v) => handleChange('deliveryLocation', v)}>
          <SelectTrigger>
            <SelectValue placeholder={t('deliveryLocationSelect')} />
          </SelectTrigger>
          <SelectContent>
            {deliveryLocations.map((loc) => (
              <SelectItem key={loc.value} value={loc.value}>
                {loc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
