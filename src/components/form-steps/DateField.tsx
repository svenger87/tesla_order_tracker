import { Label } from '@/components/ui/label'
import { Locale } from 'date-fns'

export type DatePickerFieldComponent = React.ComponentType<{
  value: string
  onChange: (value: string) => void
  placeholder: string
  locale?: Locale
  id?: string
  invalid?: boolean
  describedBy?: string
}>

/** Per-field messages, keyed by OrderFormData field name. */
export type FieldErrors = Partial<Record<string, string>>

/**
 * A labelled date picker with its error underneath, so a date that contradicts
 * another one says so where the person is looking rather than only in the
 * banner at the top of the form.
 */
export function DateField({
  id,
  label,
  value,
  onChange,
  placeholder,
  DatePickerField,
  dateLocale,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  DatePickerField: DatePickerFieldComponent
  dateLocale: Locale
  error?: string
}) {
  const errorId = `${id}-error`
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <DatePickerField
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        locale={dateLocale}
        invalid={Boolean(error)}
        describedBy={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
