'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Order, OrderFormData, validateCustomPassword, VehicleType } from '@/lib/types'
import { useOptions } from '@/hooks/useOptions'
import { useConstraints, ConstraintsForModel } from '@/hooks/useConstraints'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, KeyRound, User, Car, Palette, MapPin, ClipboardList, ChevronDown, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Locale } from 'date-fns'
import { format, parse, isValid } from 'date-fns'
import { de } from 'date-fns/locale'
import { enUS } from 'date-fns/locale'
import { FormWizard, WizardStep } from '@/components/FormWizard'
import {
  PersonalDataStep,
  VehicleStep,
  AppearanceStep,
  DeliveryStep,
  TrackingStep,
  CancellationStep,
  PasswordStep,
} from '@/components/form-steps'
import { useApiError } from '@/hooks/useApiError'

type ValidationMessageKey = Parameters<ReturnType<typeof useTranslations<'form.validation'>>>[0]

function getPasswordValidationMessageKey(errorKey: string | undefined): ValidationMessageKey {
  return (errorKey || 'invalidPassword') as ValidationMessageKey
}

interface OrderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: Order | null
  editCode?: string
  isLegacy?: boolean // Legacy order from old spreadsheet import (no editCode)
  onSuccess: () => void
  mode?: 'page' | 'modal'
}

// Helper to parse German date format (DD.MM.YYYY) to Date object
function parseGermanDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined
  // Use fixed reference date to avoid timezone issues around midnight
  const parsed = parse(dateStr, 'dd.MM.yyyy', new Date(2000, 0, 1))
  return isValid(parsed) ? parsed : undefined
}

// Helper to format Date to German format
function formatGermanDate(date: Date | undefined): string {
  if (!date) return ''
  return format(date, 'dd.MM.yyyy')
}

// DatePicker component
function DatePickerField({
  value,
  onChange,
  placeholder,
  locale: calendarLocale
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  locale?: Locale
}) {
  const [open, setOpen] = useState(false)
  const date = parseGermanDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onChange(d ? formatGermanDate(d) : '')
            setOpen(false)
          }}
          locale={calendarLocale ?? de}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

const emptyFormData: OrderFormData = {
  name: '',
  vehicleType: 'Model Y',
  orderDate: '',
  country: '',
  model: '',
  range: '',
  drive: '',
  color: '',
  interior: '',
  wheels: '',
  towHitch: '',
  autopilot: '',
  seats: '',
  deliveryWindow: '',
  deliveryLocation: '',
  vin: '',
  vinReceivedDate: '',
  papersReceivedDate: '',
  productionDate: '',
  typeApproval: '',
  typeVariant: '',
  deliveryDate: '',
  cancelled: false,
  // Password options
  useCustomPassword: true,
  customPassword: '',
  confirmPassword: '',
}

export function OrderForm({ open, onOpenChange, order, editCode, isLegacy, onSuccess, mode = 'modal' }: OrderFormProps) {
  const t = useTranslations('form')
  const tv = useTranslations('form.validation')
  const apiError = useApiError()
  const tc = useTranslations('common')
  const te = useTranslations('editCodeModal')
  const locale = useLocale()
  const dateLocale = locale === 'de' ? de : enUS
  const isMobile = useIsMobile()

  const [formData, setFormData] = useState<OrderFormData>(emptyFormData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Page mode: track submitted state and order name for success view
  const [pageSubmitted, setPageSubmitted] = useState(false)
  const [submittedName, setSubmittedName] = useState('')
  // For legacy orders: new password fields
  const [newEditCode, setNewEditCode] = useState('')
  const [confirmNewEditCode, setConfirmNewEditCode] = useState('')
  // Tracking is optional for new orders, but useful to show immediately while editing.
  const [trackingOpen, setTrackingOpen] = useState(Boolean(order))
  // Wizard step index (mobile only)
  const [wizardStep, setWizardStep] = useState(0)

  // Load dynamic options from API (filtered by vehicle type)
  const { countries, models, ranges, drives, colors, interiors, wheels, autopilot, towHitch, seats, deliveryLocations } = useOptions(formData.vehicleType)

  // Load constraints from database
  const { getConstraintsForModel, getMergedConstraints, isFieldDisabled, filterOptions } = useConstraints(formData.vehicleType)

  // Get the model value for constraint lookups (formData.model is already a value)
  const selectedModelValue = useMemo(() => {
    return formData.model || ''
  }, [formData.model])

  // Get constraints for the selected model
  const modelConstraints = useMemo(() => {
    if (!selectedModelValue) return {}
    return getConstraintsForModel(selectedModelValue)
  }, [selectedModelValue, getConstraintsForModel])

  // Get merged constraints (model + drive) for fields like seats
  const mergedConstraints = useMemo(() => {
    if (!selectedModelValue) return {}
    return getMergedConstraints(selectedModelValue, formData.drive)
  }, [selectedModelValue, formData.drive, getMergedConstraints])

  // Helper: get options for a constrained field, ensuring fixed values always have a matching SelectItem
  const getFieldOptions = useCallback(<T extends { value: string; label: string }>(
    fieldType: keyof typeof modelConstraints,
    options: T[],
    allOptions: T[] = options
  ): T[] => {
    const filtered = filterOptions(selectedModelValue, fieldType, options)
    if (filtered.length > 0) return filtered

    // For fixed fields: ensure the fixed value appears even if options haven't loaded
    const constraint = modelConstraints[fieldType as keyof ConstraintsForModel]
    if (constraint?.type === 'fixed' && constraint.fixedValue) {
      const fallback = allOptions.find(o => o.value === constraint.fixedValue)
      if (fallback) return [fallback]
      // Last resort: create a synthetic option
      return [{ value: constraint.fixedValue, label: constraint.fixedValue } as T]
    }
    return filtered
  }, [filterOptions, selectedModelValue, modelConstraints])

  // Apply fixed constraint values when constraints load or model changes
  useEffect(() => {
    if (!formData.model) return
    const constraints = getConstraintsForModel(formData.model)
    const fields = ['range', 'wheels', 'drive', 'interior', 'towHitch'] as const
    for (const field of fields) {
      const constraint = constraints[field]
      if (constraint?.type === 'fixed' && constraint.fixedValue) {
        const current = formData[field]
        if (!current || current === '' || current === '-') {
          setFormData(prev => ({ ...prev, [field]: constraint.fixedValue! }))
        }
      }
      if (constraint?.type === 'disable') {
        const current = formData[field]
        if (!current || current === '' || current === '-') {
          setFormData(prev => ({ ...prev, [field]: field === 'towHitch' ? 'nein' : '-' }))
        }
      }
    }
  }, [formData.model, getConstraintsForModel]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply merged constraints (model + drive) for seats when model or drive changes
  useEffect(() => {
    if (!formData.model) return
    const merged = getMergedConstraints(formData.model, formData.drive)
    const seatsConstraint = merged.seats
    if (seatsConstraint?.type === 'fixed' && seatsConstraint.fixedValue) {
      setFormData(prev => ({ ...prev, seats: seatsConstraint.fixedValue! }))
    } else if (seatsConstraint?.type === 'allow' && seatsConstraint.allowedValues) {
      // If current value is not in allowed list, reset
      if (formData.seats && !seatsConstraint.allowedValues.includes(formData.seats)) {
        setFormData(prev => ({ ...prev, seats: '' }))
      }
    }
  }, [formData.model, formData.drive, getMergedConstraints]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (order) {
        setFormData({
          name: order.name || '',
          vehicleType: (order.vehicleType as VehicleType) || 'Model Y',
          orderDate: order.orderDate || '',
          country: order.country || '',
          model: order.model || '',
          range: order.range || '',
          drive: order.drive || '',
          color: order.color || '',
          interior: order.interior || '',
          wheels: order.wheels || '',
          towHitch: order.towHitch || '',
          autopilot: order.autopilot || '',
          seats: order.seats || '',
          deliveryWindow: order.deliveryWindow || '',
          deliveryLocation: order.deliveryLocation || '',
          vin: order.vin || '',
          vinReceivedDate: order.vinReceivedDate || '',
          cancelled: order.cancelled ?? false,
          papersReceivedDate: order.papersReceivedDate || '',
          productionDate: order.productionDate || '',
          typeApproval: order.typeApproval || '',
          typeVariant: order.typeVariant || '',
          deliveryDate: order.deliveryDate || '',
          useCustomPassword: false,
          customPassword: '',
          confirmPassword: '',
        })
      } else {
        setFormData(emptyFormData)
      }
      setNewEditCode('')
      setConfirmNewEditCode('')
      setError('')
      setTrackingOpen(Boolean(order))
      setWizardStep(0)
    }
  }, [open, order])

  const handleChange = useCallback((field: keyof OrderFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  // Model change handler (shared between mobile/desktop)
  const handleModelChange = useCallback((v: string) => {
    handleChange('model', v)
    const modelValue = v
    if (!modelValue) return

    const constraints = getConstraintsForModel(modelValue)

    const fields = ['range', 'wheels', 'drive', 'interior'] as const
    for (const field of fields) {
      const fieldConstraint = constraints[field]
      if (fieldConstraint?.type === 'fixed' && fieldConstraint.fixedValue) {
        handleChange(field, fieldConstraint.fixedValue)
      }
    }

    if (constraints.color?.type === 'allow' && formData.color) {
      if (constraints.color.allowedValues && !constraints.color.allowedValues.includes(formData.color)) {
        handleChange('color', '')
      }
    }

    if (constraints.towHitch?.type === 'disable') {
      handleChange('towHitch', 'nein')
    } else if (constraints.towHitch?.type === 'fixed' && constraints.towHitch.fixedValue) {
      handleChange('towHitch', constraints.towHitch.fixedValue)
    }

    // Apply seats constraint (merged with drive)
    const merged = getMergedConstraints(modelValue, formData.drive)
    if (merged.seats?.type === 'fixed' && merged.seats.fixedValue) {
      handleChange('seats', merged.seats.fixedValue)
    } else {
      handleChange('seats', '')
    }
  }, [handleChange, getConstraintsForModel, getMergedConstraints, formData.color, formData.drive])

  // Vehicle type change handler
  const handleVehicleTypeChange = useCallback((v: VehicleType) => {
    handleChange('vehicleType', v)
    handleChange('model', '')
    handleChange('range', '')
    handleChange('drive', '')
    handleChange('wheels', '')
  }, [handleChange])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.name.trim()) {
      setError(tv('nameRequired'))
      setLoading(false)
      return
    }
    if (formData.name.trim().length < 3) {
      setError(tv('nameMinLength'))
      setLoading(false)
      return
    }

    if (!formData.orderDate.trim()) {
      setError(tv('orderDateRequired'))
      setLoading(false)
      return
    }

    // Validate required vehicle configuration fields (only for new orders)
    if (!order) {
      const requiredFields = [
        { field: 'model', label: t('model') },
        { field: 'color', label: t('color') },
        { field: 'interior', label: t('interior') },
        { field: 'wheels', label: t('wheels') },
        { field: 'towHitch', label: t('towHitch') },
        { field: 'seats', label: t('seats') },
        { field: 'autopilot', label: t('autopilot') },
        { field: 'country', label: t('country') },
        { field: 'deliveryLocation', label: t('deliveryLocation') },
      ] as const

      for (const { field, label } of requiredFields) {
        if (!formData[field]) {
          setError(tv('fieldRequired', { field: label }))
          setLoading(false)
          return
        }
      }
    }

    // Validate password (required for new orders)
    if (!order) {
      const validation = validateCustomPassword(formData.customPassword)
      if (!validation.valid) {
        setError(tv(getPasswordValidationMessageKey(validation.errorKey)))
        setLoading(false)
        return
      }
      if (formData.customPassword !== formData.confirmPassword) {
        setError(tv('passwordMismatch'))
        setLoading(false)
        return
      }
    }

    // Validate new password for legacy orders
    if (order && isLegacy) {
      const validation = validateCustomPassword(newEditCode)
      if (!validation.valid) {
        setError(tv(getPasswordValidationMessageKey(validation.errorKey)))
        setLoading(false)
        return
      }
      if (newEditCode !== confirmNewEditCode) {
        setError(tv('passwordMismatch'))
        setLoading(false)
        return
      }
    }

    try {
      const url = '/api/orders'
      const method = order ? 'PUT' : 'POST'

      const orderData = Object.fromEntries(
        Object.entries(formData).filter(([key]) => !['useCustomPassword', 'customPassword', 'confirmPassword'].includes(key))
      ) as Omit<OrderFormData, 'useCustomPassword' | 'customPassword' | 'confirmPassword'>
      let requestBody
      if (order) {
        if (isLegacy) {
          // editCode carries the name the user proved they knew in the verify
          // step; the server re-checks it rather than trusting isLegacy alone.
          requestBody = { id: order.id, isLegacy: true, editCode, newEditCode, expectedUpdatedAt: order.updatedAt, ...orderData }
        } else {
          requestBody = { id: order.id, editCode, expectedUpdatedAt: order.updatedAt, ...orderData }
        }
      } else {
        requestBody = {
          ...orderData,
          customPassword: formData.customPassword,
        }
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(apiError(data, tv('saveError')))
      }

      if (mode === 'page') {
        setSubmittedName(formData.name)
        setPageSubmitted(true)
      } else {
        onSuccess()
        setFormData(emptyFormData)
        onOpenChange(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tv('saveError'))
    } finally {
      setLoading(false)
    }
  }

  // Whether password step should be visible
  const showPasswordStep = !order || isLegacy

  // Step validation for wizard (returns error message or empty string)
  const validateWizardStep = useCallback((stepIndex: number): string => {
    // Build same visible steps list to map index → step id
    const stepIds = ['personal', 'vehicle', 'appearance', 'delivery', 'tracking']
    if (showPasswordStep) stepIds.push('password')

    const stepId = stepIds[stepIndex]

    switch (stepId) {
      case 'personal':
        if (!formData.name.trim()) {
          setError(tv('nameRequired'))
          return tv('nameRequired')
        }
        if (formData.name.trim().length < 3) {
          setError(tv('nameMinLength'))
          return tv('nameMinLength')
        }
        if (!formData.orderDate.trim()) {
          setError(tv('orderDateRequired'))
          return tv('orderDateRequired')
        }
        if (!formData.country && !order) {
          const msg = tv('fieldRequired', { field: t('country') })
          setError(msg)
          return msg
        }
        break
      case 'vehicle':
        if (!formData.model && !order) {
          const msg = tv('fieldRequired', { field: t('model') })
          setError(msg)
          return msg
        }
        break
      case 'appearance':
        if (!order) {
          const checks = [
            { field: 'color' as const, label: t('color') },
            { field: 'interior' as const, label: t('interior') },
            { field: 'wheels' as const, label: t('wheels') },
            { field: 'towHitch' as const, label: t('towHitch') },
            { field: 'autopilot' as const, label: t('autopilot') },
          ]
          for (const { field, label } of checks) {
            if (!formData[field]) {
              const msg = tv('fieldRequired', { field: label })
              setError(msg)
              return msg
            }
          }
        }
        break
      case 'delivery':
        if (!formData.deliveryLocation && !order) {
          const msg = tv('fieldRequired', { field: t('deliveryLocation') })
          setError(msg)
          return msg
        }
        break
      // tracking + password: no required fields to gate navigation
    }
    setError('')
    return ''
  }, [formData, order, showPasswordStep, tv, t])

  // Build wizard steps
  const wizardSteps: WizardStep[] = useMemo(() => {
    const steps: WizardStep[] = [
      {
        id: 'personal',
        icon: User,
        label: t('personalData'),
        content: (
          <PersonalDataStep
            formData={formData}
            handleChange={handleChange}
            countries={countries}
            t={(key: string) => t(key)}
            DatePickerField={DatePickerField}
            dateLocale={dateLocale}
          />
        ),
      },
      {
        id: 'vehicle',
        icon: Car,
        label: t('vehicle'),
        content: (
          <VehicleStep
            formData={formData}
            handleChange={handleChange}
            models={models}
            ranges={ranges}
            drives={drives}
            selectedModelValue={selectedModelValue}
            modelConstraints={modelConstraints}
            isFieldDisabled={isFieldDisabled}
            getFieldOptions={getFieldOptions}
            onModelChange={handleModelChange}
            onVehicleTypeChange={handleVehicleTypeChange}
            t={(key: string, values?: Record<string, string>) => t(key, values)}
          />
        ),
      },
      {
        id: 'appearance',
        icon: Palette,
        label: t('appearance'),
        content: (
          <AppearanceStep
            formData={formData}
            handleChange={handleChange}
            colors={colors}
            interiors={interiors}
            wheels={wheels}
            towHitch={towHitch}
            seats={seats}
            autopilot={autopilot}
            models={models}
            selectedModelValue={selectedModelValue}
            modelConstraints={modelConstraints}
            mergedConstraints={mergedConstraints}
            isFieldDisabled={isFieldDisabled}
            getFieldOptions={getFieldOptions}
            filterOptions={filterOptions}
            t={(key: string, values?: Record<string, string>) => t(key, values)}
          />
        ),
      },
      {
        id: 'delivery',
        icon: MapPin,
        label: t('delivery'),
        content: (
          <DeliveryStep
            formData={formData}
            handleChange={handleChange}
            deliveryLocations={deliveryLocations}
            t={(key: string) => t(key)}
          />
        ),
      },
      {
        id: 'tracking',
        icon: ClipboardList,
        label: t('statusTracking'),
        content: (
          <div className="space-y-4">
            <TrackingStep
              formData={formData}
              handleChange={handleChange}
              t={(key: string) => t(key)}
              DatePickerField={DatePickerField}
              dateLocale={dateLocale}
            />
            {/* Reachable on a phone at last — this control existed only in the
                desktop tree, so wizard users could not cancel their order. */}
            {order && (
              <CancellationStep
                formData={formData}
                handleChange={handleChange}
                t={(key: string) => t(key)}
              />
            )}
          </div>
        ),
      },
    ]

    if (showPasswordStep) {
      steps.push({
        id: 'password',
        icon: KeyRound,
        label: order && isLegacy ? t('legacyPasswordTitle') : t('password'),
        content: (
          <PasswordStep
            formData={formData}
            handleChange={handleChange}
            order={order}
            isLegacy={isLegacy}
            newEditCode={newEditCode}
            setNewEditCode={setNewEditCode}
            confirmNewEditCode={confirmNewEditCode}
            setConfirmNewEditCode={setConfirmNewEditCode}
            t={(key: string) => t(key)}
          />
        ),
      })
    }

    return steps
  }, [
    formData, handleChange, countries, models, ranges, drives, colors, interiors,
    wheels, towHitch, seats, autopilot, deliveryLocations, selectedModelValue, modelConstraints, mergedConstraints,
    isFieldDisabled, getFieldOptions, filterOptions, handleModelChange, handleVehicleTypeChange,
    dateLocale, order, isLegacy, newEditCode, confirmNewEditCode, showPasswordStep, t,
  ])

  // ─── Page Mode: Success View ─────────────────────────────────
  if (mode === 'page' && pageSubmitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-10 px-6 text-center">
          <div className="rounded-full bg-green-50 dark:bg-green-900/20 p-4">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{te('orderCreated')}</h2>
            <p className="text-muted-foreground">{te('passwordSecuredDescription')}</p>
            <p className="text-sm text-muted-foreground">{te('clickEditToChange')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/${locale}`}>
              <Button variant="outline">{te('backToOverview')}</Button>
            </Link>
            <Link href={`/${locale}?search=${encodeURIComponent(submittedName)}`}>
              <Button>{te('viewMyOrder')}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── Page Mode: Form in Card ───────────────────────────────────
  if (mode === 'page') {
    const formHeader = (
      <CardHeader>
        <CardTitle>{order ? t('editOrder') : t('newOrder')}</CardTitle>
        <CardDescription>{order ? t('editOrderDescription') : t('newOrderDescription')}</CardDescription>
      </CardHeader>
    )

    if (isMobile) {
      return (
        <Card>
          {formHeader}
          <CardContent>
            <FormWizard
              steps={wizardSteps}
              currentStep={wizardStep}
              onStepChange={setWizardStep}
              onSubmit={() => handleSubmit()}
              loading={loading}
              isEdit={!!order}
              error={error}
              validateStep={validateWizardStep}
            />
          </CardContent>
        </Card>
      )
    }

    // Page mode desktop: render the form content directly in a Card (see below — reuses the desktop form JSX)
  }

  // ─── Mobile Wizard (modal mode) ────────────────────────────────
  if (isMobile && mode !== 'page') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-4">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {order ? t('editOrder') : t('newOrder')}
            </DialogTitle>
            <DialogDescription>
              {order ? t('editOrderDescription') : t('newOrderDescription')}
            </DialogDescription>
          </DialogHeader>

          <FormWizard
            steps={wizardSteps}
            currentStep={wizardStep}
            onStepChange={setWizardStep}
            onSubmit={() => handleSubmit()}
            loading={loading}
            isEdit={!!order}
            error={error}
            validateStep={validateWizardStep}
          />
        </DialogContent>
      </Dialog>
    )
  }

  // ─── Desktop Layout ────────────────────────────────────────────
  const desktopFormContent = (
    <>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Section 1: Persönliche Daten */}
          <div className="space-y-3 rounded-lg border surface-subtle p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold border-b pb-2">
              <User className="h-4 w-4 text-primary" />
              {t('personalData')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PersonalDataStep
                formData={formData}
                handleChange={handleChange}
                countries={countries}
                t={(key: string) => t(key)}
                DatePickerField={DatePickerField}
                dateLocale={dateLocale}
                className="contents"
              />
            </div>
          </div>

          {/* Section 2: Fahrzeugkonfiguration */}
          <div className="space-y-3 rounded-lg border surface-subtle p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold border-b pb-2">
              <Car className="h-4 w-4 text-primary" />
              {t('vehicleConfig')}
            </h4>
            {/* Two steps, one grid. `contents` drops their own wrappers so the
                ten fields stay a single flowing sequence — split into two grids
                they would break into a ragged row after the drive select. */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <VehicleStep
                formData={formData}
                handleChange={handleChange}
                models={models}
                ranges={ranges}
                drives={drives}
                selectedModelValue={selectedModelValue}
                modelConstraints={modelConstraints}
                isFieldDisabled={isFieldDisabled}
                getFieldOptions={getFieldOptions}
                onModelChange={handleModelChange}
                onVehicleTypeChange={handleVehicleTypeChange}
                t={(key: string, values?: Record<string, string>) => t(key, values)}
                className="contents"
              />
              <AppearanceStep
                formData={formData}
                handleChange={handleChange}
                colors={colors}
                interiors={interiors}
                wheels={wheels}
                towHitch={towHitch}
                seats={seats}
                autopilot={autopilot}
                models={models}
                selectedModelValue={selectedModelValue}
                modelConstraints={modelConstraints}
                mergedConstraints={mergedConstraints}
                isFieldDisabled={isFieldDisabled}
                getFieldOptions={getFieldOptions}
                filterOptions={filterOptions}
                t={(key: string, values?: Record<string, string>) => t(key, values)}
                className="contents"
              />
            </div>
          </div>

          {/* Section 3: Lieferung */}
          <div className="space-y-3 rounded-lg border surface-subtle p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold border-b pb-2">
              <MapPin className="h-4 w-4 text-primary" />
              {t('delivery')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DeliveryStep
                formData={formData}
                handleChange={handleChange}
                deliveryLocations={deliveryLocations}
                t={(key: string) => t(key)}
                className="contents"
              />
            </div>
          </div>

          {/* Section 4: Status & Tracking (collapsible) */}
          <div className="space-y-3 rounded-lg border surface-subtle p-4">
            <button
              type="button"
              onClick={() => setTrackingOpen(!trackingOpen)}
              className="flex items-center justify-between w-full text-sm font-semibold border-b pb-2"
            >
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                {t('statusTracking')}
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", trackingOpen && "rotate-180")} />
            </button>
            {trackingOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <TrackingStep
                  formData={formData}
                  handleChange={handleChange}
                  t={(key: string) => t(key)}
                  DatePickerField={DatePickerField}
                  dateLocale={dateLocale}
                  className="contents"
                />
              </div>
            )}
          </div>

          {/* Cancellation — edit mode only; a new order is never born cancelled */}
          {order && (
            <div className="mt-4">
              <CancellationStep
                formData={formData}
                handleChange={handleChange}
                t={(key: string) => t(key)}
              />
            </div>
          )}

          {/* New Password for Legacy Orders */}
          {order && isLegacy && (
            <div className="border-t pt-4 mt-4">
              <PasswordStep
                formData={formData}
                handleChange={handleChange}
                order={order}
                isLegacy={isLegacy}
                newEditCode={newEditCode}
                setNewEditCode={setNewEditCode}
                confirmNewEditCode={confirmNewEditCode}
                setConfirmNewEditCode={setConfirmNewEditCode}
                t={(key: string) => t(key)}
              />
            </div>
          )}

          {/* Password - only for new orders */}
          {!order && (
            <div className="space-y-3 rounded-lg border surface-subtle p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold border-b pb-2">
                <KeyRound className="h-4 w-4 text-primary" />
                {t('password')}
              </h4>
              <PasswordStep
                formData={formData}
                handleChange={handleChange}
                order={order}
                isLegacy={isLegacy}
                newEditCode={newEditCode}
                setNewEditCode={setNewEditCode}
                confirmNewEditCode={confirmNewEditCode}
                setConfirmNewEditCode={setConfirmNewEditCode}
                t={(key: string) => t(key)}
                showHeading={false}
                className="space-y-3"
                fieldsClassName="grid grid-cols-1 md:grid-cols-2 gap-4"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            {mode === 'modal' && (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tc('cancel')}
              </Button>
            )}
            {mode === 'page' && (
              <Link href={`/${locale}`}>
                <Button type="button" variant="outline">
                  {tc('cancel')}
                </Button>
              </Link>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? tc('saving') : order ? tc('update') : tc('add')}
            </Button>
          </div>
        </form>
    </>
  )

  // Page mode desktop: render in a Card
  if (mode === 'page') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{order ? t('editOrder') : t('newOrder')}</CardTitle>
          <CardDescription>{order ? t('editOrderDescription') : t('newOrderDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {desktopFormContent}
        </CardContent>
      </Card>
    )
  }

  // Modal mode desktop: render in Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order ? t('editOrder') : t('newOrder')}
          </DialogTitle>
          <DialogDescription>
            {order ? t('editOrderDescription') : t('newOrderDescription')}
          </DialogDescription>
        </DialogHeader>
        {desktopFormContent}
      </DialogContent>
    </Dialog>
  )
}
