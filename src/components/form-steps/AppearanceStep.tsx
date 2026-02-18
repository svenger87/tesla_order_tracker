import { OrderFormData } from '@/lib/types'
import { FormOption } from '@/hooks/useOptions'
import { ConstraintsForModel } from '@/hooks/useConstraints'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface AppearanceStepProps {
  formData: OrderFormData
  handleChange: (field: keyof OrderFormData, value: string | boolean) => void
  colors: FormOption[]
  interiors: FormOption[]
  wheels: FormOption[]
  towHitch: FormOption[]
  autopilot: FormOption[]
  models: FormOption[]
  selectedModelValue: string
  modelConstraints: ConstraintsForModel
  isFieldDisabled: (modelValue: string, fieldType: keyof ConstraintsForModel) => boolean
  getFieldOptions: <T extends { value: string; label: string }>(
    fieldType: keyof ConstraintsForModel,
    options: T[],
    allOptions?: T[]
  ) => T[]
  filterOptions: (modelValue: string, fieldType: keyof ConstraintsForModel, options: FormOption[]) => FormOption[]
  t: (key: string, values?: Record<string, string>) => string
}

export function AppearanceStep({
  formData,
  handleChange,
  colors,
  interiors,
  wheels,
  towHitch,
  autopilot,
  models,
  selectedModelValue,
  modelConstraints,
  isFieldDisabled,
  getFieldOptions,
  filterOptions,
  t,
}: AppearanceStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="color">{t('color')} *</Label>
        <Select value={formData.color} onValueChange={(v) => handleChange('color', v)}>
          <SelectTrigger>
            <SelectValue placeholder={t('colorSelect')}>
              {formData.color && (
                <div className="flex items-center gap-2">
                  {(() => {
                    const colorOpt = colors.find(c => c.value === formData.color)
                    return colorOpt?.hex ? (
                      <span
                        className={cn(
                          "w-4 h-4 rounded-full inline-block",
                          colorOpt.border && "border border-border"
                        )}
                        style={{ backgroundColor: colorOpt.hex }}
                      />
                    ) : null
                  })()}
                  {colors.find(c => c.value === formData.color)?.label || formData.color}
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {getFieldOptions('color', colors).map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <div className="flex items-center gap-2">
                  {c.hex && (
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full inline-block",
                        c.border && "border border-border"
                      )}
                      style={{ backgroundColor: c.hex }}
                    />
                  )}
                  {c.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {modelConstraints.color?.type === 'allow' && (
          <p className="text-xs text-muted-foreground">
            {t('constraintColorRestricted', { model: models.find(m => m.value === formData.model)?.label ?? formData.model })}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="interior">{t('interior')} *</Label>
        <Select
          value={formData.interior}
          onValueChange={(v) => handleChange('interior', v)}
          disabled={isFieldDisabled(selectedModelValue, 'interior')}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('interiorSelect')} />
          </SelectTrigger>
          <SelectContent>
            {getFieldOptions('interior', interiors).map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {modelConstraints.interior?.type === 'fixed' && (
          <p className="text-xs text-muted-foreground">
            {t('constraintFixed', { model: models.find(m => m.value === formData.model)?.label ?? formData.model, value: interiors.find(i => i.value === formData.interior)?.label ?? formData.interior })}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="wheels">{t('wheels')} *</Label>
        <Select
          value={formData.wheels}
          onValueChange={(v) => handleChange('wheels', v)}
          disabled={isFieldDisabled(selectedModelValue, 'wheels')}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('wheelsSelect')} />
          </SelectTrigger>
          <SelectContent>
            {getFieldOptions('wheels', wheels).map((w) => (
              <SelectItem key={w.value} value={w.value}>
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {modelConstraints.wheels?.type === 'fixed' && (
          <p className="text-xs text-muted-foreground">
            {t('constraintFixed', { model: models.find(m => m.value === formData.model)?.label ?? formData.model, value: wheels.find(w => w.value === formData.wheels)?.label ?? formData.wheels })}
          </p>
        )}
        {modelConstraints.wheels?.type === 'allow' && (
          <p className="text-xs text-muted-foreground">
            {t('constraintWheelsRestricted', { model: models.find(m => m.value === formData.model)?.label ?? formData.model })}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="towHitch">{t('towHitch')} *</Label>
        <Select
          value={formData.towHitch}
          onValueChange={(v) => handleChange('towHitch', v)}
          disabled={isFieldDisabled(selectedModelValue, 'towHitch')}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('towHitchSelect')} />
          </SelectTrigger>
          <SelectContent>
            {(modelConstraints.towHitch?.type === 'disable'
              ? [{ value: 'nein', label: 'Nein' }]
              : filterOptions(selectedModelValue, 'towHitch', towHitch)
            ).map((th) => (
              <SelectItem key={th.value} value={th.value}>
                {th.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {modelConstraints.towHitch?.type === 'disable' && (
          <p className="text-xs text-muted-foreground">
            {t('constraintTowHitchUnavailable', { model: models.find(m => m.value === formData.model)?.label ?? formData.model })}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="autopilot">{t('autopilot')} *</Label>
        <Select value={formData.autopilot} onValueChange={(v) => handleChange('autopilot', v)}>
          <SelectTrigger>
            <SelectValue placeholder={t('autopilotSelect')} />
          </SelectTrigger>
          <SelectContent>
            {autopilot.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
