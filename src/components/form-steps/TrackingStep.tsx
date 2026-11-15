import { OrderFormData } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Locale } from 'date-fns'
import { DateField, DatePickerFieldComponent, FieldErrors } from './DateField'

interface TrackingStepProps {
  formData: OrderFormData
  handleChange: (field: keyof OrderFormData, value: string | boolean) => void
  t: (key: string) => string
  DatePickerField: DatePickerFieldComponent
  dateLocale: Locale
  /** Messages for dates that contradict another, shown under the field. */
  errors?: FieldErrors
  /** See PersonalDataStep — `contents` lets the desktop grid own these fields. */
  className?: string
}

export function TrackingStep({
  formData,
  handleChange,
  t,
  DatePickerField,
  dateLocale,
  errors,
  className = 'space-y-4',
}: TrackingStepProps) {
  return (
    <div className={className}>
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

      <DateField
        id="vinReceivedDate"
        label={t('vinReceivedAt')}
        value={formData.vinReceivedDate}
        onChange={(v) => handleChange('vinReceivedDate', v)}
        placeholder={t('datePlaceholder')}
        DatePickerField={DatePickerField}
        dateLocale={dateLocale}
        error={errors?.vinReceivedDate}
      />

      <DateField
        id="papersReceivedDate"
        label={t('papersReceivedAt')}
        value={formData.papersReceivedDate}
        onChange={(v) => handleChange('papersReceivedDate', v)}
        placeholder={t('datePlaceholder')}
        DatePickerField={DatePickerField}
        dateLocale={dateLocale}
        error={errors?.papersReceivedDate}
      />

      <DateField
        id="productionDate"
        label={t('productionDate')}
        value={formData.productionDate}
        onChange={(v) => handleChange('productionDate', v)}
        placeholder={t('datePlaceholder')}
        DatePickerField={DatePickerField}
        dateLocale={dateLocale}
        error={errors?.productionDate}
      />

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

      <DateField
        id="deliveryDate"
        label={t('deliveryDate')}
        value={formData.deliveryDate}
        onChange={(v) => handleChange('deliveryDate', v)}
        placeholder={t('datePlaceholder')}
        DatePickerField={DatePickerField}
        dateLocale={dateLocale}
        error={errors?.deliveryDate}
      />
    </div>
  )
}
