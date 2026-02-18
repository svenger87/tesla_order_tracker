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
import { TwemojiEmoji } from '@/components/TwemojiText'
import { Locale } from 'date-fns'

interface PersonalDataStepProps {
  formData: OrderFormData
  handleChange: (field: keyof OrderFormData, value: string | boolean) => void
  countries: FormOption[]
  t: (key: string) => string
  DatePickerField: React.ComponentType<{
    value: string
    onChange: (value: string) => void
    placeholder: string
    locale?: Locale
  }>
  dateLocale: Locale
}

export function PersonalDataStep({
  formData,
  handleChange,
  countries,
  t,
  DatePickerField,
  dateLocale,
}: PersonalDataStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('name')} *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder={t('namePlaceholder')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="orderDate">{t('orderDate')} *</Label>
        <DatePickerField
          value={formData.orderDate}
          onChange={(v) => handleChange('orderDate', v)}
          placeholder={t('datePlaceholder')}
          locale={dateLocale}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">{t('country')} *</Label>
        <Select value={formData.country} onValueChange={(v) => handleChange('country', v)}>
          <SelectTrigger>
            <SelectValue placeholder={t('countrySelect')} />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <span className="flex items-center gap-2">
                  {c.flag && <TwemojiEmoji emoji={c.flag} size={16} />}
                  {c.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
