'use client'

import { useState, useEffect } from 'react'
import { Order, OrderFormData, COLORS, RANGES, validateCustomPassword } from '@/lib/types'
import { useOptions } from '@/hooks/useOptions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CalendarIcon, KeyRound, Shuffle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parse, isValid } from 'date-fns'
import { de } from 'date-fns/locale'

interface OrderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: Order | null
  editCode?: string
  isLegacy?: boolean // Legacy order from old spreadsheet import (no editCode)
  onSuccess: (editCode?: string) => void
}

// Helper to parse German date format (DD.MM.YYYY) to Date object
function parseGermanDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined
  const parsed = parse(dateStr, 'dd.MM.yyyy', new Date())
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
  placeholder
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
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
          locale={de}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

const emptyFormData: OrderFormData = {
  name: '',
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
  deliveryWindow: '',
  deliveryLocation: '',
  vin: '',
  vinReceivedDate: '',
  papersReceivedDate: '',
  productionDate: '',
  typeApproval: '',
  typeVariant: '',
  deliveryDate: '',
  // Password options
  useCustomPassword: true,
  customPassword: '',
  confirmPassword: '',
}

export function OrderForm({ open, onOpenChange, order, editCode, isLegacy, onSuccess }: OrderFormProps) {
  const [formData, setFormData] = useState<OrderFormData>(emptyFormData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // For legacy orders: new password fields
  const [newEditCode, setNewEditCode] = useState('')
  const [confirmNewEditCode, setConfirmNewEditCode] = useState('')

  // Load dynamic options from API
  const { countries, models, drives, colors, interiors, wheels, autopilot, towHitch, deliveryLocations } = useOptions()

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (order) {
        setFormData({
          name: order.name || '',
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
          deliveryWindow: order.deliveryWindow || '',
          deliveryLocation: order.deliveryLocation || '',
          vin: order.vin || '',
          vinReceivedDate: order.vinReceivedDate || '',
          papersReceivedDate: order.papersReceivedDate || '',
          productionDate: order.productionDate || '',
          typeApproval: order.typeApproval || '',
          typeVariant: order.typeVariant || '',
          deliveryDate: order.deliveryDate || '',
          // Password not editable when editing
          useCustomPassword: false,
          customPassword: '',
          confirmPassword: '',
        })
      } else {
        // New order - reset to defaults with custom password enabled
        setFormData(emptyFormData)
      }
      // Reset legacy password fields
      setNewEditCode('')
      setConfirmNewEditCode('')
      setError('')
    }
  }, [open, order])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.name.trim()) {
      setError('Name ist erforderlich')
      setLoading(false)
      return
    }

    // Validate custom password if selected (only for new orders)
    if (!order && formData.useCustomPassword) {
      const validation = validateCustomPassword(formData.customPassword)
      if (!validation.valid) {
        setError(validation.error || 'Ungültiges Passwort')
        setLoading(false)
        return
      }
      if (formData.customPassword !== formData.confirmPassword) {
        setError('Passwörter stimmen nicht überein')
        setLoading(false)
        return
      }
    }

    // Validate new password for legacy orders
    if (order && isLegacy) {
      const validation = validateCustomPassword(newEditCode)
      if (!validation.valid) {
        setError(validation.error || 'Ungültiges Passwort')
        setLoading(false)
        return
      }
      if (newEditCode !== confirmNewEditCode) {
        setError('Passwörter stimmen nicht überein')
        setLoading(false)
        return
      }
    }

    try {
      const url = '/api/orders'
      const method = order ? 'PUT' : 'POST'

      // Build request body
      let requestBody
      if (order) {
        if (isLegacy) {
          // Legacy order: include isLegacy flag and newEditCode
          requestBody = { id: order.id, isLegacy: true, newEditCode, expectedUpdatedAt: order.updatedAt, ...formData }
        } else {
          // Normal edit: include editCode and expectedUpdatedAt for conflict detection
          requestBody = { id: order.id, editCode, expectedUpdatedAt: order.updatedAt, ...formData }
        }
      } else {
        // New order
        requestBody = {
          ...formData,
          // Include custom password if user chose to set one
          customPassword: formData.useCustomPassword ? formData.customPassword : undefined,
        }
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Speichern')
      }

      // For legacy orders, show the new edit code in success
      if (isLegacy && data.editCode) {
        onSuccess(data.editCode)
      } else {
        // Pass whether it was a custom password to the success handler
        onSuccess(formData.useCustomPassword ? undefined : data.editCode)
      }
      setFormData(emptyFormData)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof OrderFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order ? 'Bestellung bearbeiten' : 'Neue Bestellung'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Benutzername"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderDate">Bestelldatum</Label>
              <DatePickerField
                value={formData.orderDate}
                onChange={(v) => handleChange('orderDate', v)}
                placeholder="TT.MM.JJJJ"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Land</Label>
              <Select value={formData.country} onValueChange={(v) => handleChange('country', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Land wählen" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.value} value={c.flag ? `${c.flag} ${c.label}` : c.label}>
                      {c.flag && `${c.flag} `}{c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={formData.model} onValueChange={(v) => {
                handleChange('model', v)
                // Auto-set fields based on model
                if (v === 'Performance') {
                  handleChange('range', 'Maximale Reichweite')
                  handleChange('wheels', '21"')
                  handleChange('drive', 'AWD')
                } else if (v === 'Standard') {
                  handleChange('range', 'Standard')
                  handleChange('wheels', '18"')
                  handleChange('drive', 'RWD')
                } else if (v === 'Premium') {
                  handleChange('range', 'Maximale Reichweite')
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Model wählen" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.value} value={m.label}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reichweite - shown for all models, disabled for Performance/Standard, editable for Premium (Q3 exception) */}
            <div className="space-y-2">
              <Label htmlFor="range">Reichweite</Label>
              <Select
                value={formData.range}
                onValueChange={(v) => handleChange('range', v)}
                disabled={formData.model === 'Performance' || formData.model === 'Standard'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Reichweite wählen" />
                </SelectTrigger>
                <SelectContent>
                  {RANGES.map((r) => (
                    <SelectItem key={r.value} value={r.label}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.model === 'Performance' && (
                <p className="text-xs text-muted-foreground">Performance ist immer Max. Reichweite</p>
              )}
              {formData.model === 'Standard' && (
                <p className="text-xs text-muted-foreground">Standard ist immer Standard-Reichweite</p>
              )}
              {formData.model === 'Premium' && (
                <p className="text-xs text-muted-foreground">Premium ist normalerweise Max. Reichweite (Q3: editierbar)</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="drive">Antrieb</Label>
              <Select
                value={formData.drive}
                onValueChange={(v) => handleChange('drive', v)}
                disabled={formData.model === 'Standard' || formData.model === 'Performance'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Antrieb wählen" />
                </SelectTrigger>
                <SelectContent>
                  {drives.map((d) => (
                    <SelectItem key={d.value} value={d.label}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.model === 'Standard' && (
                <p className="text-xs text-muted-foreground">Standard hat immer RWD</p>
              )}
              {formData.model === 'Performance' && (
                <p className="text-xs text-muted-foreground">Performance hat immer AWD</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Farbe</Label>
              <Select value={formData.color} onValueChange={(v) => handleChange('color', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Farbe wählen">
                    {formData.color && (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const colorOpt = colors.find(c => c.label === formData.color)
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
                        {formData.color}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {colors.map((c) => (
                    <SelectItem key={c.value} value={c.label}>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="interior">Innenraum</Label>
              <Select value={formData.interior} onValueChange={(v) => handleChange('interior', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Innenraum wählen" />
                </SelectTrigger>
                <SelectContent>
                  {interiors.map((i) => (
                    <SelectItem key={i.value} value={i.label}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wheels">Felgen</Label>
              <Select
                value={formData.wheels}
                onValueChange={(v) => handleChange('wheels', v)}
                disabled={formData.model === 'Standard' || formData.model === 'Performance'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Felgen wählen" />
                </SelectTrigger>
                <SelectContent>
                  {wheels
                    .filter((w) => {
                      // Premium only has 19" and 20"
                      if (formData.model === 'Premium') {
                        return w.label.includes('19') || w.label.includes('20')
                      }
                      return true
                    })
                    .map((w) => (
                      <SelectItem key={w.value} value={w.label}>
                        {w.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {formData.model === 'Standard' && (
                <p className="text-xs text-muted-foreground">Standard hat immer 18"</p>
              )}
              {formData.model === 'Performance' && (
                <p className="text-xs text-muted-foreground">Performance hat immer 21"</p>
              )}
              {formData.model === 'Premium' && (
                <p className="text-xs text-muted-foreground">Premium: nur 19" oder 20"</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="towHitch">AHK (Anhängerkupplung)</Label>
              <Select value={formData.towHitch} onValueChange={(v) => handleChange('towHitch', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="AHK wählen" />
                </SelectTrigger>
                <SelectContent>
                  {towHitch.map((t) => (
                    <SelectItem key={t.value} value={t.label}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="autopilot">Autopilot</Label>
              <Select value={formData.autopilot} onValueChange={(v) => handleChange('autopilot', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Autopilot wählen" />
                </SelectTrigger>
                <SelectContent>
                  {autopilot.map((a) => (
                    <SelectItem key={a.value} value={a.label}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryWindow">Lieferfenster</Label>
              <Input
                id="deliveryWindow"
                value={formData.deliveryWindow}
                onChange={(e) => handleChange('deliveryWindow', e.target.value)}
                placeholder="z.B. 11.02.-18.02.2026"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryLocation">Ort (Auslieferung) *</Label>
              <Select value={formData.deliveryLocation} onValueChange={(v) => handleChange('deliveryLocation', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Auslieferungsort wählen" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryLocations.map((loc) => (
                    <SelectItem key={loc.value} value={loc.label}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                value={formData.vin}
                onChange={(e) => handleChange('vin', e.target.value)}
                placeholder="Fahrzeug-Identnummer"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vinReceivedDate">VIN erhalten am</Label>
              <DatePickerField
                value={formData.vinReceivedDate}
                onChange={(v) => handleChange('vinReceivedDate', v)}
                placeholder="TT.MM.JJJJ"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="papersReceivedDate">Papiere erhalten am</Label>
              <DatePickerField
                value={formData.papersReceivedDate}
                onChange={(v) => handleChange('papersReceivedDate', v)}
                placeholder="TT.MM.JJJJ"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productionDate">Produktionsdatum</Label>
              <DatePickerField
                value={formData.productionDate}
                onChange={(v) => handleChange('productionDate', v)}
                placeholder="TT.MM.JJJJ"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="typeApproval">Typgenehmigung</Label>
              <Input
                id="typeApproval"
                value={formData.typeApproval}
                onChange={(e) => handleChange('typeApproval', e.target.value)}
                placeholder="Letzte 2 Ziffern"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="typeVariant">Typ-Variante</Label>
              <Input
                id="typeVariant"
                value={formData.typeVariant}
                onChange={(e) => handleChange('typeVariant', e.target.value)}
                placeholder="YS[5L|5M|6M][R|D]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Auslieferungsdatum</Label>
              <DatePickerField
                value={formData.deliveryDate}
                onChange={(v) => handleChange('deliveryDate', v)}
                placeholder="TT.MM.JJJJ"
              />
            </div>
          </div>

          {/* New Password for Legacy Orders */}
          {order && isLegacy && (
            <div className="border-t pt-4 mt-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-4 mb-4">
                <h4 className="font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <KeyRound className="h-4 w-4" />
                  Neues Passwort erforderlich
                </h4>
                <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                  Dein Eintrag stammt aus der alten Tabelle und hat noch kein Passwort.
                  Bitte lege jetzt ein Passwort fest, um zukünftige Änderungen vornehmen zu können.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEditCode">Neues Passwort *</Label>
                  <Input
                    id="newEditCode"
                    type="password"
                    value={newEditCode}
                    onChange={(e) => setNewEditCode(e.target.value)}
                    placeholder="Mindestens 6 Zeichen, eine Zahl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmNewEditCode">Passwort bestätigen *</Label>
                  <Input
                    id="confirmNewEditCode"
                    type="password"
                    value={confirmNewEditCode}
                    onChange={(e) => setConfirmNewEditCode(e.target.value)}
                    placeholder="Passwort wiederholen"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Mindestens 6 Zeichen und mindestens eine Zahl. Dieses Passwort ersetzt deinen Benutzernamen als Bearbeitungscode.
                </p>
              </div>
            </div>
          )}

          {/* Password Choice - only for new orders */}
          {!order && (
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Bearbeitungscode
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Mit diesem Code kannst du deine Bestellung später bearbeiten.
              </p>
              <RadioGroup
                value={formData.useCustomPassword ? 'custom' : 'auto'}
                onValueChange={(value) => handleChange('useCustomPassword', value === 'custom')}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="custom" id="custom" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="custom" className="flex items-center gap-2 cursor-pointer font-medium">
                      <KeyRound className="h-4 w-4" />
                      Eigenes Passwort festlegen
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Wähle ein Passwort, das du dir leicht merken kannst.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="auto" id="auto" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="auto" className="flex items-center gap-2 cursor-pointer font-medium">
                      <Shuffle className="h-4 w-4" />
                      Code automatisch generieren
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ein sicherer Code wird für dich erstellt. Speichere ihn gut!
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {/* Custom password fields */}
              {formData.useCustomPassword && (
                <div className="mt-4 pl-7 space-y-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="customPassword">Passwort</Label>
                    <Input
                      id="customPassword"
                      type="password"
                      value={formData.customPassword}
                      onChange={(e) => handleChange('customPassword', e.target.value)}
                      placeholder="Mindestens 6 Zeichen, eine Zahl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      placeholder="Passwort wiederholen"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mindestens 6 Zeichen und mindestens eine Zahl.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Speichern...' : order ? 'Aktualisieren' : 'Hinzufügen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
