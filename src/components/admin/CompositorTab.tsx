'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Image, Plus, Pencil, Trash2, RefreshCw, Database, Eye } from 'lucide-react'
import { TeslaCarImage } from '@/components/TeslaCarImage'
import { useTranslations } from 'next-intl'

interface CompositorCode {
  id: string
  category: string
  vehicleType: string
  lookupKey: string
  code: string
  label: string | null
  isActive: boolean
  sortOrder: number
}

const CATEGORIES = [
  { value: 'body', label: 'Body' },
  { value: 'wheel', label: 'Wheels' },
  { value: 'interior', label: 'Interior' },
  { value: 'color', label: 'Colors' },
]

const VEHICLE_TYPES = ['Model Y', 'Model 3']

export function CompositorTab() {
  const t = useTranslations('admin')
  const tc = useTranslations('common')
  const tf = useTranslations('form')
  const [codes, setCodes] = useState<CompositorCode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('body')
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all')

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingCode, setEditingCode] = useState<CompositorCode | null>(null)
  const [formData, setFormData] = useState({
    category: 'body',
    vehicleType: 'Model Y',
    lookupKey: '',
    code: '',
    label: '',
    sortOrder: 0,
  })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Seed state
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState('')

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewVehicle, setPreviewVehicle] = useState<'Model Y' | 'Model 3'>('Model Y')
  const [previewColor, setPreviewColor] = useState('pearl_white')
  const [previewWheels, setPreviewWheels] = useState('19')
  const [previewModel, setPreviewModel] = useState('premium')
  const [previewDrive, setPreviewDrive] = useState('awd')
  const [previewInterior, setPreviewInterior] = useState('black')

  const fetchCodes = useCallback(async () => {
    try {
      const res = await fetch('/api/compositor-codes')
      if (!res.ok) throw new Error('Failed to fetch')
      const map = await res.json()

      // Flatten the nested map into a flat array for display
      // We need the raw records, so let's fetch them differently
      // Actually, the GET endpoint returns a map — for the admin we need the raw records
      // Let's just parse the map
      const flat: CompositorCode[] = []
      for (const category of Object.keys(map)) {
        for (const vehicleType of Object.keys(map[category])) {
          for (const lookupKey of Object.keys(map[category][vehicleType])) {
            const entry = map[category][vehicleType][lookupKey]
            flat.push({
              id: `${category}_${vehicleType}_${lookupKey}`,
              category,
              vehicleType,
              lookupKey,
              code: entry.code,
              label: entry.label,
              isActive: true,
              sortOrder: 0,
            })
          }
        }
      }
      setCodes(flat)
    } catch (error) {
      console.error('Failed to fetch compositor codes:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch raw records from DB for admin (we need IDs for edit/delete)
  const fetchRawCodes = useCallback(async () => {
    try {
      // Use the seed GET endpoint to see what's in DB, or we can query directly
      // Actually let's add a query param to get raw records
      const res = await fetch('/api/compositor-codes?raw=true')
      if (!res.ok) {
        // Fallback to regular fetch
        await fetchCodes()
        return
      }
      const data = await res.json()
      if (Array.isArray(data)) {
        setCodes(data)
      } else {
        // It returned the map, flatten it
        await fetchCodes()
      }
    } catch {
      await fetchCodes()
    } finally {
      setLoading(false)
    }
  }, [fetchCodes])

  useEffect(() => {
    fetchRawCodes()
  }, [fetchRawCodes])

  const handleSeed = async (reset: boolean = false) => {
    setSeeding(true)
    setSeedMessage('')
    try {
      const url = reset
        ? '/api/admin/seed-compositor-codes?reset=true'
        : '/api/admin/seed-compositor-codes'
      const res = await fetch(url, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Seed failed')
      setSeedMessage(t('constraintCreated', { created: data.created, skipped: data.skipped }))
      await fetchRawCodes()
      setTimeout(() => setSeedMessage(''), 5000)
    } catch (err) {
      setSeedMessage(`${tc('error')}: ${err instanceof Error ? err.message : 'Unknown'}`)
    } finally {
      setSeeding(false)
    }
  }

  const openCreateDialog = () => {
    setEditingCode(null)
    setFormData({
      category: selectedCategory,
      vehicleType: selectedVehicle === 'all' ? 'Model Y' : selectedVehicle,
      lookupKey: '',
      code: '',
      label: '',
      sortOrder: 0,
    })
    setFormError('')
    setEditDialogOpen(true)
  }

  const openEditDialog = (code: CompositorCode) => {
    setEditingCode(code)
    setFormData({
      category: code.category,
      vehicleType: code.vehicleType,
      lookupKey: code.lookupKey,
      code: code.code,
      label: code.label || '',
      sortOrder: code.sortOrder,
    })
    setFormError('')
    setEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.lookupKey || !formData.code) {
      setFormError(t('requiredFields'))
      return
    }

    setSaving(true)
    setFormError('')

    try {
      if (editingCode) {
        // Update
        const res = await fetch('/api/compositor-codes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCode.id,
            code: formData.code,
            label: formData.label || null,
            sortOrder: formData.sortOrder,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Update failed')
        }
      } else {
        // Create
        const res = await fetch('/api/compositor-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Create failed')
        }
      }

      setEditDialogOpen(false)
      await fetchRawCodes()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (code: CompositorCode) => {
    if (!confirm(`${tc('delete')} "${code.code}" (${code.lookupKey})?`)) return

    try {
      const res = await fetch(`/api/compositor-codes?id=${code.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      await fetchRawCodes()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const filteredCodes = codes.filter(c => {
    if (c.category !== selectedCategory) return false
    if (selectedVehicle !== 'all' && c.vehicleType !== selectedVehicle) return false
    return true
  })

  const categoryCount = (cat: string) => codes.filter(c => c.category === cat).length

  return (
    <div className="space-y-6">
      {/* Seed & Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            {t('compositorCodes')}
          </CardTitle>
          <CardDescription>
            {t('compositorDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleSeed(false)} disabled={seeding} variant="outline" size="sm">
              <Database className={`h-4 w-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />
              {seeding ? t('seeding') : t('seedMissing')}
            </Button>
            <Button onClick={() => handleSeed(true)} disabled={seeding} variant="destructive" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />
              {t('resetAll')}
            </Button>
            <Button onClick={() => setPreviewOpen(true)} variant="secondary" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              {t('preview')}
            </Button>
          </div>

          {seedMessage && (
            <div className={`px-4 py-2 rounded-md text-sm ${seedMessage.startsWith(tc('error')) ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
              {seedMessage}
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            {t('codesLoaded', { count: codes.length })}
            {CATEGORIES.map(cat => (
              <span key={cat.value} className="ml-3">
                {cat.label}: {categoryCount(cat.value)}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Code Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Category tabs */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1">
              <TabsList>
                {CATEGORIES.map(cat => (
                  <TabsTrigger key={cat.value} value={cat.value}>
                    {cat.label}
                    <Badge variant="secondary" className="ml-1.5 text-xs">{categoryCount(cat.value)}</Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Vehicle filter */}
            <div className="flex items-center gap-2">
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc('all')}</SelectItem>
                  {VEHICLE_TYPES.map(vt => (
                    <SelectItem key={vt} value={vt}>{vt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={openCreateDialog} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {tc('new')}
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-muted-foreground p-4">{tc('loading')}</p>
          ) : filteredCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('noCodes')}</p>
              <p className="text-sm mt-1">{t('noCodesHint')}</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">{t('vehicleType')}</th>
                    <th className="text-left p-3 font-medium">{t('lookupKey')}</th>
                    <th className="text-left p-3 font-medium">{t('teslaCode')}</th>
                    <th className="text-left p-3 font-medium">{t('label')}</th>
                    <th className="text-right p-3 font-medium">{tc('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map((code) => (
                    <tr key={`${code.category}_${code.vehicleType}_${code.lookupKey}`} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {code.vehicleType === 'Model Y' ? 'MY' : 'M3'}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-xs">{code.lookupKey}</td>
                      <td className="p-3">
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-bold">{code.code}</code>
                      </td>
                      <td className="p-3 text-muted-foreground">{code.label || '—'}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(code)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(code)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCode ? t('editCode') : t('createCode')}</DialogTitle>
            <DialogDescription>
              {editingCode
                ? t('editCodeDesc', { path: `${editingCode.category}/${editingCode.vehicleType}/${editingCode.lookupKey}` })
                : t('createCodeDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
                {formError}
              </div>
            )}

            {!editingCode && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{tc('configuration')}</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData(d => ({ ...d, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('vehicleType')}</Label>
                    <Select value={formData.vehicleType} onValueChange={(v) => setFormData(d => ({ ...d, vehicleType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map(vt => (
                          <SelectItem key={vt} value={vt}>{vt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lookupKey">{t('lookupKey')}</Label>
                  <Input
                    id="lookupKey"
                    value={formData.lookupKey}
                    onChange={(e) => setFormData(d => ({ ...d, lookupKey: e.target.value }))}
                    placeholder="z.B. standard_rwd, 18, pearl_white"
                    className="font-mono"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="teslaCode">{t('teslaCode')}</Label>
              <Input
                id="teslaCode"
                value={formData.code}
                onChange={(e) => setFormData(d => ({ ...d, code: e.target.value }))}
                placeholder="z.B. MTY61, WY18P, PPSW"
                className="font-mono font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">{t('label')}</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(d => ({ ...d, label: e.target.value }))}
                placeholder="z.B. Standard RWD, 18&quot; Aperture"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">{t('sortOrder')}</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData(d => ({ ...d, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-24"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{tc('cancel')}</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? tc('saving') : editingCode ? tc('save') : tc('add')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('compositorPreview')}</DialogTitle>
            <DialogDescription>
              {t('compositorPreviewDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('vehicleType')}</Label>
                <Select value={previewVehicle} onValueChange={(v) => setPreviewVehicle(v as 'Model Y' | 'Model 3')}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Model Y">Model Y</SelectItem>
                    <SelectItem value="Model 3">Model 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('trim')}</Label>
                <Select value={previewModel} onValueChange={setPreviewModel}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{tf('drive')}</Label>
                <Select value={previewDrive} onValueChange={setPreviewDrive}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rwd">RWD</SelectItem>
                    <SelectItem value="awd">AWD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{tf('wheels')}</Label>
                <Select value={previewWheels} onValueChange={setPreviewWheels}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="18">18&quot;</SelectItem>
                    <SelectItem value="19">19&quot;</SelectItem>
                    <SelectItem value="20">20&quot;</SelectItem>
                    <SelectItem value="21">21&quot;</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{tf('color')}</Label>
                <Select value={previewColor} onValueChange={setPreviewColor}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pearl_white">Pearl White</SelectItem>
                    <SelectItem value="solid_black">Solid Black</SelectItem>
                    <SelectItem value="diamond_black">Diamond Black</SelectItem>
                    <SelectItem value="stealth_grey">Stealth Grey</SelectItem>
                    <SelectItem value="quicksilver">Quicksilver</SelectItem>
                    <SelectItem value="ultra_red">Ultra Red</SelectItem>
                    <SelectItem value="glacier_blue">Glacier Blue</SelectItem>
                    <SelectItem value="marine_blue">Marine Blue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{tf('interior')}</Label>
                <Select value={previewInterior} onValueChange={setPreviewInterior}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="black">Black</SelectItem>
                    <SelectItem value="white">White</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
              <TeslaCarImage
                vehicleType={previewVehicle}
                color={previewColor}
                wheels={previewWheels}
                model={previewModel}
                drive={previewDrive}
                interior={previewInterior}
                size={400}
                fetchSize={800}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
