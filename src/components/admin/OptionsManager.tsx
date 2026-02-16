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
import { useTranslations } from 'next-intl'

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
  { value: 'all', label: 'Alle Fahrzeuge' },
  { value: 'Model Y', label: 'Model Y' },
  { value: 'Model 3', label: 'Model 3' },
]

const OPTION_TYPES = [
  { type: 'country', formKey: 'country', hasFlag: true, valueHint: 'deutschland', labelHint: 'Deutschland' },
  { type: 'model', formKey: 'model', valueHint: 'model_y_rwd', labelHint: 'Model Y RWD' },
  { type: 'range', formKey: 'range', valueHint: 'standard', labelHint: 'Standard' },
  { type: 'drive', formKey: 'drive', valueHint: 'awd', labelHint: 'AWD' },
  { type: 'color', formKey: 'color', hasColor: true, valueHint: 'pearl_white', labelHint: 'Pearl White' },
  { type: 'interior', formKey: 'interior', valueHint: 'schwarz', labelHint: 'Black' },
  { type: 'wheels', formKey: 'wheels', valueHint: 'gemini_19', labelHint: 'Gemini 19"' },
  { type: 'autopilot', formKey: 'autopilot', valueHint: 'fsd', labelHint: 'Full Self-Driving' },
  { type: 'towHitch', formKey: 'towHitch', valueHint: 'yes', labelHint: 'Yes' },
  { type: 'deliveryLocation', formKey: 'deliveryLocation', valueHint: 'muenchen', labelHint: 'Munich' },
]

export function OptionsManager() {
  const t = useTranslations('admin')
  const tc = useTranslations('common')
  const tf = useTranslations('form')
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
    setFormData({ value: '', label: '', vehicleType: 'all' })
    setDialogOpen(true)
  }

  const openEditDialog = (option: Option) => {
    setDialogType(option.type)
    setEditingOption(option)
    setFormData({
      value: option.value,
      label: option.label,
      vehicleType: option.vehicleType || 'all',
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

      // Convert 'all' to null for database storage
      const vehicleTypeForDb = formData.vehicleType === 'all' ? null : formData.vehicleType

      if (editingOption) {
        // Update
        const res = await fetch('/api/options', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingOption.id,
            label: formData.label,
            vehicleType: vehicleTypeForDb,
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || tc('error'))
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
            vehicleType: vehicleTypeForDb,
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
            sortOrder: getOptionsForType(dialogType).length,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || tc('error'))
        }
      }

      setSuccess(editingOption ? t('optionUpdated') : t('optionAdded'))
      setTimeout(() => setSuccess(''), 3000)
      setDialogOpen(false)
      fetchOptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (option: Option) => {
    if (!confirm(`${tc('delete')} "${option.label}"?`)) return

    try {
      const res = await fetch(`/api/options?id=${option.id}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error(tc('error'))
      }
      setSuccess(t('optionDeleted'))
      setTimeout(() => setSuccess(''), 3000)
      fetchOptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('loadingOptions')}
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
            {t('optionsManager')}
          </CardTitle>
          <CardDescription>
            {t('optionsDescription')}
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
            {OPTION_TYPES.map(({ type, formKey, hasFlag, hasColor }) => {
              const typeOptions = getOptionsForType(type)

              return (
                <AccordionItem key={type} value={type}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span>{tf(formKey as 'country' | 'model' | 'range' | 'drive' | 'color' | 'interior' | 'wheels' | 'autopilot' | 'towHitch' | 'deliveryLocation')}</span>
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
                        {t('addOption', { type: tf(formKey as 'country' | 'model' | 'range' | 'drive' | 'color' | 'interior' | 'wheels' | 'autopilot' | 'towHitch' | 'deliveryLocation') })}
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
              {editingOption ? t('editOption') : t('addNewOption')}
            </DialogTitle>
            <DialogDescription>
              {dialogType && tf(getTypeConfig(dialogType)?.formKey as 'country' | 'model' | 'range' | 'drive' | 'color' | 'interior' | 'wheels' | 'autopilot' | 'towHitch' | 'deliveryLocation')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingOption && (
              <div className="space-y-2">
                <Label htmlFor="value">{t('internalValue')}</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) => setFormData(f => ({ ...f, value: e.target.value }))}
                  placeholder={dialogType ? getTypeConfig(dialogType)?.valueHint || '' : ''}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="label">{t('displayName')}</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(f => ({ ...f, label: e.target.value }))}
                placeholder={dialogType ? getTypeConfig(dialogType)?.labelHint || '' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleType">{t('vehicleType')}</Label>
              <Select
                value={formData.vehicleType}
                onValueChange={(v) => setFormData(f => ({ ...f, vehicleType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('allVehicles')} />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPE_OPTIONS.map((vt) => (
                    <SelectItem key={vt.value} value={vt.value}>
                      {vt.value === 'all' ? t('allVehicles') : vt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('vehicleTypeHint')}
              </p>
            </div>

            {dialogType && getTypeConfig(dialogType)?.hasFlag && (
              <div className="space-y-2">
                <Label>{t('flagEmoji')}</Label>
                <FlagEmojiPicker
                  value={formData.flag || ''}
                  onChange={(flag) => setFormData(f => ({ ...f, flag }))}
                />
              </div>
            )}

            {dialogType && getTypeConfig(dialogType)?.hasColor && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="hex">{t('colorCode')}</Label>
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
                  <Label htmlFor="border">{t('showBorder')}</Label>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? tc('saving') : tc('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
