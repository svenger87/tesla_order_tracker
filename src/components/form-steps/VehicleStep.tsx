import { OrderFormData, VEHICLE_TYPES, VehicleType } from '@/lib/types'
import { FormOption } from '@/hooks/useOptions'
import { ConstraintsForModel, FieldConstraint } from '@/hooks/useConstraints'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface VehicleStepProps {
  formData: OrderFormData
  handleChange: (field: keyof OrderFormData, value: string | boolean) => void
  models: FormOption[]
  ranges: FormOption[]
  drives: FormOption[]
  selectedModelValue: string
  modelConstraints: ConstraintsForModel
  isFieldDisabled: (modelValue: string, fieldType: keyof ConstraintsForModel) => boolean
  getFieldOptions: <T extends { value: string; label: string }>(
    fieldType: keyof ConstraintsForModel,
    options: T[],
    allOptions?: T[]
  ) => T[]
  onModelChange: (value: string) => void
  onVehicleTypeChange: (value: VehicleType) => void
  t: (key: string, values?: Record<string, string>) => string
}

export function VehicleStep({
  formData,
  handleChange,
  models,
  ranges,
  drives,
  selectedModelValue,
  modelConstraints,
  isFieldDisabled,
  getFieldOptions,
  onModelChange,
  onVehicleTypeChange,
  t,
}: VehicleStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vehicleType">{t('vehicle')} *</Label>
        <Select
          value={formData.vehicleType}
          onValueChange={(v) => onVehicleTypeChange(v as VehicleType)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('vehicleSelect')} />
          </SelectTrigger>
          <SelectContent>
            {VEHICLE_TYPES.map((vt) => (
              <SelectItem key={vt.value} value={vt.value}>
                {vt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">{t('model')} *</Label>
        <Select value={formData.model} onValueChange={onModelChange}>
          <SelectTrigger>
            <SelectValue placeholder={t('modelSelect')} />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="range">{t('range')}</Label>
        <Select
          value={formData.range}
          onValueChange={(v) => handleChange('range', v)}
          disabled={isFieldDisabled(selectedModelValue, 'range')}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('rangeSelect')} />
          </SelectTrigger>
          <SelectContent>
            {getFieldOptions('range', ranges).map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {modelConstraints.range?.type === 'fixed' && (
          <p className="text-xs text-muted-foreground">
            {t('constraintFixed', { model: models.find(m => m.value === formData.model)?.label ?? formData.model, value: ranges.find(r => r.value === formData.range)?.label ?? formData.range })}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="drive">{t('drive')}</Label>
        <Select
          value={formData.drive}
          onValueChange={(v) => handleChange('drive', v)}
          disabled={isFieldDisabled(selectedModelValue, 'drive')}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('driveSelect')} />
          </SelectTrigger>
          <SelectContent>
            {getFieldOptions('drive', drives).map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {modelConstraints.drive?.type === 'fixed' && (
          <p className="text-xs text-muted-foreground">
            {t('constraintFixed', { model: models.find(m => m.value === formData.model)?.label ?? formData.model, value: drives.find(d => d.value === formData.drive)?.label ?? formData.drive })}
          </p>
        )}
      </div>
    </div>
  )
}
