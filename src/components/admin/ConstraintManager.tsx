'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Settings2, Save, Loader2, Check, Database } from 'lucide-react'
import { VEHICLE_TYPES, VehicleType } from '@/lib/types'

interface Option {
  id: string
  type: string
  value: string
  label: string
  vehicleType: string | null
}

interface Constraint {
  id: string
  sourceType: string
  sourceValue: string
  vehicleType: string | null
  targetType: string
  constraintType: 'allow' | 'fixed' | 'disable'
  values: string[] | string
  isActive: boolean
}

type ConstraintType = 'none' | 'allow' | 'fixed' | 'disable'

interface FieldConfig {
  type: ConstraintType
  allowedValues: string[]
  fixedValue: string
}

// Target fields that can have constraints
const TARGET_FIELDS = [
  { type: 'wheels', label: 'Felgen' },
  { type: 'color', label: 'Farben' },
  { type: 'interior', label: 'Innenraum' },
  { type: 'range', label: 'Reichweite' },
  { type: 'drive', label: 'Antrieb' },
  { type: 'towHitch', label: 'AHK' },
] as const

export function ConstraintManager() {
  // State
  const [vehicleType, setVehicleType] = useState<VehicleType>('Model Y')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [options, setOptions] = useState<Option[]>([])
  const [constraints, setConstraints] = useState<Constraint[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Field configurations for the selected model
  const [fieldConfigs, setFieldConfigs] = useState<Record<string, FieldConfig>>({})

  // Fetch options
  const fetchOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/options')
      if (res.ok) {
        const data = await res.json()
        setOptions(data)
      }
    } catch (err) {
      console.error('Failed to fetch options:', err)
    }
  }, [])

  // Fetch constraints
  const fetchConstraints = useCallback(async () => {
    try {
      const res = await fetch('/api/constraints')
      if (res.ok) {
        const data = await res.json()
        setConstraints(data)
      }
    } catch (err) {
      console.error('Failed to fetch constraints:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOptions()
    fetchConstraints()
  }, [fetchOptions, fetchConstraints])

  // Get models for selected vehicle type
  const models = options.filter(o =>
    o.type === 'model' &&
    (o.vehicleType === vehicleType || o.vehicleType === null)
  )

  // Get options for a target field
  const getOptionsForField = (fieldType: string) => {
    return options.filter(o =>
      o.type === fieldType &&
      (o.vehicleType === vehicleType || o.vehicleType === null)
    )
  }

  // Load existing constraints when model changes
  useEffect(() => {
    if (!selectedModel) {
      setFieldConfigs({})
      return
    }

    // Find existing constraints for this model
    const modelConstraints = constraints.filter(c =>
      c.sourceType === 'model' &&
      c.sourceValue === selectedModel &&
      (c.vehicleType === vehicleType || c.vehicleType === null)
    )

    // Build field configs from existing constraints
    const configs: Record<string, FieldConfig> = {}

    for (const field of TARGET_FIELDS) {
      const constraint = modelConstraints.find(c => c.targetType === field.type)

      if (constraint) {
        configs[field.type] = {
          type: constraint.constraintType,
          allowedValues: Array.isArray(constraint.values) ? constraint.values : [],
          fixedValue: typeof constraint.values === 'string' ? constraint.values : '',
        }
      } else {
        configs[field.type] = {
          type: 'none',
          allowedValues: [],
          fixedValue: '',
        }
      }
    }

    setFieldConfigs(configs)
  }, [selectedModel, vehicleType, constraints])

  // Handle constraint type change
  const handleConstraintTypeChange = (fieldType: string, type: ConstraintType) => {
    setFieldConfigs(prev => ({
      ...prev,
      [fieldType]: {
        ...prev[fieldType],
        type,
        // Reset values when changing type
        allowedValues: type === 'allow' ? prev[fieldType]?.allowedValues || [] : [],
        fixedValue: type === 'fixed' ? prev[fieldType]?.fixedValue || '' : '',
      },
    }))
  }

  // Handle allowed value toggle
  const handleAllowedValueToggle = (fieldType: string, value: string, checked: boolean) => {
    setFieldConfigs(prev => {
      const current = prev[fieldType]?.allowedValues || []
      const newValues = checked
        ? [...current, value]
        : current.filter(v => v !== value)

      return {
        ...prev,
        [fieldType]: {
          ...prev[fieldType],
          allowedValues: newValues,
        },
      }
    })
  }

  // Handle fixed value change
  const handleFixedValueChange = (fieldType: string, value: string) => {
    setFieldConfigs(prev => ({
      ...prev,
      [fieldType]: {
        ...prev[fieldType],
        fixedValue: value,
      },
    }))
  }

  // Save constraints
  const handleSave = async () => {
    if (!selectedModel) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Get the model option to find its value
      const modelOption = models.find(m => m.value === selectedModel)
      if (!modelOption) {
        throw new Error('Modell nicht gefunden')
      }

      // Process each field
      for (const field of TARGET_FIELDS) {
        const config = fieldConfigs[field.type]
        if (!config) continue

        // Find existing constraint
        const existingConstraint = constraints.find(c =>
          c.sourceType === 'model' &&
          c.sourceValue === selectedModel &&
          c.targetType === field.type &&
          (c.vehicleType === vehicleType || c.vehicleType === null)
        )

        if (config.type === 'none') {
          // Delete existing constraint if any
          if (existingConstraint) {
            await fetch(`/api/constraints?id=${existingConstraint.id}`, {
              method: 'DELETE',
            })
          }
        } else {
          // Prepare values
          let values: string[] | string
          if (config.type === 'allow') {
            values = config.allowedValues
          } else if (config.type === 'fixed') {
            values = config.fixedValue
          } else {
            values = []
          }

          if (existingConstraint) {
            // Update existing
            await fetch('/api/constraints', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: existingConstraint.id,
                constraintType: config.type,
                values,
              }),
            })
          } else {
            // Create new
            await fetch('/api/constraints', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sourceType: 'model',
                sourceValue: selectedModel,
                vehicleType: vehicleType,
                targetType: field.type,
                constraintType: config.type,
                values,
              }),
            })
          }
        }
      }

      // Refresh constraints
      await fetchConstraints()
      setSuccess('Einschränkungen gespeichert!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  // Seed constraints from hardcoded rules
  const handleSeed = async () => {
    setSeeding(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/seed-constraints', {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Seeden')
      }

      setSuccess(`${data.created} Einschränkungen erstellt, ${data.skipped} übersprungen`)
      await fetchConstraints()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Seeden')
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Lade Einschränkungen...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Modell-Einschränkungen
            </CardTitle>
            <CardDescription>
              Konfiguriere welche Optionen für jedes Modell verfügbar sind
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding}
          >
            {seeding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            {seeding ? 'Seede...' : 'Standard-Regeln laden'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded-md text-sm flex items-center gap-2">
            <Check className="h-4 w-4" />
            {success}
          </div>
        )}

        {/* Vehicle and Model Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fahrzeug</Label>
            <Select
              value={vehicleType}
              onValueChange={(v) => {
                setVehicleType(v as VehicleType)
                setSelectedModel('')
              }}
            >
              <SelectTrigger>
                <SelectValue />
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
            <Label>Modell / Ausstattung</Label>
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder="Modell wählen..." />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Constraint Configuration */}
        {selectedModel && (
          <div className="space-y-6 border-t pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Einschränkungen für: {models.find(m => m.value === selectedModel)?.label}
              </h3>
              <Badge variant="outline">{vehicleType}</Badge>
            </div>

            {TARGET_FIELDS.map((field) => {
              const fieldOptions = getOptionsForField(field.type)
              const config = fieldConfigs[field.type] || { type: 'none', allowedValues: [], fixedValue: '' }

              return (
                <div key={field.type} className="space-y-3 p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">{field.label}</Label>
                    {config.type !== 'none' && (
                      <Badge variant={config.type === 'fixed' ? 'default' : config.type === 'disable' ? 'destructive' : 'secondary'}>
                        {config.type === 'allow' && 'Eingeschränkt'}
                        {config.type === 'fixed' && 'Fest'}
                        {config.type === 'disable' && 'Deaktiviert'}
                      </Badge>
                    )}
                  </div>

                  <RadioGroup
                    value={config.type}
                    onValueChange={(v) => handleConstraintTypeChange(field.type, v as ConstraintType)}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id={`${field.type}-none`} />
                      <Label htmlFor={`${field.type}-none`} className="cursor-pointer">
                        Alle erlaubt
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="allow" id={`${field.type}-allow`} />
                      <Label htmlFor={`${field.type}-allow`} className="cursor-pointer">
                        Einschränken
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fixed" id={`${field.type}-fixed`} />
                      <Label htmlFor={`${field.type}-fixed`} className="cursor-pointer">
                        Fest (auto-gesetzt)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="disable" id={`${field.type}-disable`} />
                      <Label htmlFor={`${field.type}-disable`} className="cursor-pointer">
                        Deaktiviert
                      </Label>
                    </div>
                  </RadioGroup>

                  {/* Allow - Checkbox list */}
                  {config.type === 'allow' && (
                    <div className="pl-4 pt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {fieldOptions.map((opt) => (
                        <div key={opt.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${field.type}-${opt.value}`}
                            checked={config.allowedValues.includes(opt.value)}
                            onCheckedChange={(checked) =>
                              handleAllowedValueToggle(field.type, opt.value, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`${field.type}-${opt.value}`}
                            className="cursor-pointer text-sm"
                          >
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fixed - Single select */}
                  {config.type === 'fixed' && (
                    <div className="pl-4 pt-2">
                      <Select
                        value={config.fixedValue}
                        onValueChange={(v) => handleFixedValueChange(field.type, v)}
                      >
                        <SelectTrigger className="w-full md:w-64">
                          <SelectValue placeholder="Wert wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Einschränkungen speichern
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {!selectedModel && (
          <div className="text-center py-8 text-muted-foreground">
            Wähle ein Fahrzeug und Modell, um die Einschränkungen zu konfigurieren
          </div>
        )}
      </CardContent>
    </Card>
  )
}
