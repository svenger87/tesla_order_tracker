import { OrderFormData } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Locale } from 'date-fns'

interface TrackingStepProps {
  formData: OrderFormData
  handleChange: (field: keyof OrderFormData, value: string | boolean) => void
  t: (key: string) => string
  DatePickerField: React.ComponentType<{
    value: string
    onChange: (value: string) => void
    placeholder: string
    locale?: Locale
  }>
  dateLocale: Locale
}

export function TrackingStep({
  formData,
  handleChange,
  t,
  DatePickerField,
  dateLocale,
}: TrackingStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vin">{t('vin')}</Label>
        <Input
          id="vin"
          value={formData.vin}
          onChange={(e) => handleChange('vin', e.target.value)}
          placeholder={t('vinPlaceholder')}
          className="font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="vinReceivedDate">{t('vinReceivedAt')}</Label>
        <DatePickerField
          value={formData.vinReceivedDate}
          onChange={(v) => handleChange('vinReceivedDate', v)}
          placeholder={t('datePlaceholder')}
          locale={dateLocale}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="papersReceivedDate">{t('papersReceivedAt')}</Label>
        <DatePickerField
          value={formData.papersReceivedDate}
          onChange={(v) => handleChange('papersReceivedDate', v)}
          placeholder={t('datePlaceholder')}
          locale={dateLocale}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="productionDate">{t('productionDate')}</Label>
        <DatePickerField
          value={formData.productionDate}
          onChange={(v) => handleChange('productionDate', v)}
          placeholder={t('datePlaceholder')}
          locale={dateLocale}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="typeApproval">{t('typeApproval')}</Label>
        <Input
          id="typeApproval"
          value={formData.typeApproval}
          onChange={(e) => handleChange('typeApproval', e.target.value)}
          placeholder={t('typeApprovalPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="typeVariant">{t('typeVariant')}</Label>
        <Input
          id="typeVariant"
          value={formData.typeVariant}
          onChange={(e) => handleChange('typeVariant', e.target.value)}
          placeholder={t('typeVariantPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="deliveryDate">{t('deliveryDate')}</Label>
        <DatePickerField
          value={formData.deliveryDate}
          onChange={(v) => handleChange('deliveryDate', v)}
          placeholder={t('datePlaceholder')}
          locale={dateLocale}
        />
      </div>
    </div>
  )
}
