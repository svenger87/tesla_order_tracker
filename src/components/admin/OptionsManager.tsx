'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings2, Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { FlagEmojiPicker } from './FlagEmojiPicker'
import { TwemojiEmoji } from '@/components/TwemojiText'

interface OptionMetadata {
  flag?: string
  hex?: string
  border?: boolean
}

interface Option {
  id: string
  type: string
  value: string
  label: string
  vehicleType: string | null  // null = applies to all vehicles
  metadata: OptionMetadata | null
  sortOrder: number
}

interface OptionFormData {
  value: string
  label: string
  vehicleType: string  // '' = all vehicles, 'Model Y', 'Model 3'
  flag?: string
  hex?: string
  border?: boolean
}

const VEHICLE_TYPE_OPTIONS = [
  { value: '', label: 'Alle Fahrzeuge' },
  { value: 'Model Y', label: 'Model Y' },
  { value: 'Model 3', label: 'Model 3' },
]

const OPTION_TYPES = [
  { type: 'country', label: 'Länder', singular: 'Land', hasFlag: true, valueHint: 'deutschland', labelHint: 'Deutschland' },
  { type: 'model', label: 'Modelle', singular: 'Modell', valueHint: 'model_y_rwd', labelHint: 'Model Y RWD' },
  { type: 'range', label: 'Reichweiten', singular: 'Reichweite', valueHint: 'standard', labelHint: 'Standard' },
  { type: 'drive', label: 'Antriebe', singular: 'Antrieb', valueHint: 'awd', labelHint: 'Allrad (AWD)' },
  { type: 'color', label: 'Farben', singular: 'Farbe', hasColor: true, valueHint: 'pearl_white', labelHint: 'Pearl White' },
  { type: 'interior', label: 'Innenräume', singular: 'Innenraum', valueHint: 'schwarz', labelHint: 'Schwarz' },
  { type: 'wheels', label: 'Felgen', singular: 'Felge', valueHint: 'gemini_19', labelHint: 'Gemini 19"' },
  { type: 'autopilot', label: 'Autopilot', singular: 'Autopilot', valueHint: 'fsd', labelHint: 'Full Self-Driving' },
  { type: 'towHitch', label: 'Anhängerkupplung', singular: 'Anhängerkupplung', valueHint: 'yes', labelHint: 'Ja' },
  { type: 'deliveryLocation', label: 'Auslieferungsorte', singular: 'Auslieferungsort', valueHint: 'muenchen', labelHint: 'München-Parsdorf' },
]

export function OptionsManager() {
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<string | null>(null)
  const [editingOption, setEditingOption] = useState<Option | null>(null)
  const [formData, setFormData] = useState<OptionFormData>({ value: '', label: '', vehicleType: '' })
  const [saving, setSaving] = useState(false)

  const fetchOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/options')
      if (res.ok) {
        const data = await res.json()
        setOptions(data)
      }
    } catch (err) {
      console.error('Failed to fetch options:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  const getOptionsForType = (type: string) => {
    const typeOptions = options.filter(o => o.type === type)
    // Sort countries alphabetically with German locale for proper umlaut handling
    if (type === 'country') {
      return typeOptions.sort((a, b) => a.label.localeCompare(b.label, 'de', { sensitivity: 'base' }))
    }
    return typeOptions.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  const getTypeConfig = (type: string) => {
    return OPTION_TYPES.find(t => t.type === type)
  }

  const openAddDialog = (type: string) => {
    setDialogType(type)
    setEditingOption(null)
    setFormData({ value: '', label: '', vehicleType: '' })
    setDialogOpen(true)
  }

  const openEditDialog = (option: Option) => {
    setDialogType(option.type)
    setEditingOption(option)
    setFormData({
      value: option.value,
      label: option.label,
      vehicleType: option.vehicleType || '',
      flag: option.metadata?.flag,
      hex: option.metadata?.hex,
      border: option.metadata?.border,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!dialogType) return

    setSaving(true)
    setError('')

    try {
      const typeConfig = getTypeConfig(dialogType)
      const metadata: OptionMetadata = {}

      if (typeConfig?.hasFlag && formData.flag) {
        metadata.flag = formData.flag
      }
      if (typeConfig?.hasColor) {
        if (formData.hex) metadata.hex = formData.hex
        if (formData.border !== undefined) metadata.border = formData.border
      }

      if (editingOption) {
        // Update
        const res = await fetch('/api/options', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingOption.id,
            label: formData.label,
            vehicleType: formData.vehicleType || null,  // null = all vehicles
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Fehler beim Speichern')
        }
      } else {
        // Create
        const res = await fetch('/api/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: dialogType,
            value: formData.value,
            label: formData.label,
            vehicleType: formData.vehicleType || null,  // null = all vehicles
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
            sortOrder: getOptionsForType(dialogType).length,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Fehler beim Erstellen')
        }
      }

      setSuccess(editingOption ? 'Option aktualisiert!' : 'Option hinzugefügt!')
      setTimeout(() => setSuccess(''), 3000)
      setDialogOpen(false)
      fetchOptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (option: Option) => {
    if (!confirm(`"${option.label}" wirklich löschen?`)) return

    try {
      const res = await fetch(`/api/options?id=${option.id}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error('Fehler beim Löschen')
      }
      setSuccess('Option gelöscht!')
      setTimeout(() => setSuccess(''), 3000)
      fetchOptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Lade Optionen...
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Dropdown-Optionen verwalten
          </CardTitle>
          <CardDescription>
            Verwalte die Auswahlmöglichkeiten für das Bestellformular
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded-md text-sm">
              {success}
            </div>
          )}

          <Accordion type="multiple" className="w-full">
            {OPTION_TYPES.map(({ type, label, singular, hasFlag, hasColor }) => {
              const typeOptions = getOptionsForType(type)

              return (
                <AccordionItem key={type} value={type}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span>{label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {typeOptions.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {typeOptions.map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground opacity-50" />
                            {hasFlag && option.metadata?.flag && (
                              <TwemojiEmoji emoji={option.metadata.flag} size={18} />
                            )}
                            {hasColor && option.metadata?.hex && (
                              <span
                                className="w-4 h-4 rounded-full border border-border"
                                style={{ backgroundColor: option.metadata.hex }}
                              />
                            )}
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">
                              ({option.value})
                            </span>
                            {option.vehicleType && (
                              <Badge variant="outline" className="text-xs ml-1">
                                {option.vehicleType}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditDialog(option)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(option)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => openAddDialog(type)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {singular} hinzufügen
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOption ? 'Option bearbeiten' : 'Neue Option hinzufügen'}
            </DialogTitle>
            <DialogDescription>
              {dialogType && getTypeConfig(dialogType)?.label}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingOption && (
              <div className="space-y-2">
                <Label htmlFor="value">Wert (intern)</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) => setFormData(f => ({ ...f, value: e.target.value }))}
                  placeholder={`z.B. ${dialogType ? getTypeConfig(dialogType)?.valueHint || 'wert' : 'wert'}`}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="label">Anzeigename</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(f => ({ ...f, label: e.target.value }))}
                placeholder={`z.B. ${dialogType ? getTypeConfig(dialogType)?.labelHint || 'Anzeigename' : 'Anzeigename'}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleType">Fahrzeugtyp</Label>
              <Select
                value={formData.vehicleType}
                onValueChange={(v) => setFormData(f => ({ ...f, vehicleType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alle Fahrzeuge" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPE_OPTIONS.map((vt) => (
                    <SelectItem key={vt.value || 'all'} value={vt.value}>
                      {vt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leer lassen für Optionen die für alle Fahrzeuge gelten
              </p>
            </div>

            {dialogType && getTypeConfig(dialogType)?.hasFlag && (
              <div className="space-y-2">
                <Label>Flagge (Emoji)</Label>
                <FlagEmojiPicker
                  value={formData.flag || ''}
                  onChange={(flag) => setFormData(f => ({ ...f, flag }))}
                />
              </div>
            )}

            {dialogType && getTypeConfig(dialogType)?.hasColor && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="hex">Farbcode (Hex)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="hex"
                      value={formData.hex || ''}
                      onChange={(e) => setFormData(f => ({ ...f, hex: e.target.value }))}
                      placeholder="#FFFFFF"
                    />
                    {formData.hex && (
                      <div
                        className="w-10 h-10 rounded border border-border shrink-0"
                        style={{ backgroundColor: formData.hex }}
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="border"
                    checked={formData.border || false}
                    onChange={(e) => setFormData(f => ({ ...f, border: e.target.checked }))}
                  />
                  <Label htmlFor="border">Rand anzeigen (für helle Farben)</Label>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
