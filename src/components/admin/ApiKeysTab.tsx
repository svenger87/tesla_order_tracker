'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations, useFormatter } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Code2, Copy, Check, ExternalLink, Eye, EyeOff, KeyRound, Plus, Pencil, Ban, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Link } from '@/i18n/navigation'
import { API_SCOPES, type ApiScope } from '@/lib/api-scopes'
import type { UsageSummary } from '@/lib/api-usage'

interface BuiltinView {
  id: string
  name: string
  envVar: 'TOST_API_KEY' | 'EXTERNAL_API_KEY'
  configured: boolean
  scopes: ApiScope[]
  requestsToday: number
}

interface KeyView {
  id: string
  name: string
  contact: string | null
  keyPrefix: string
  scopes: ApiScope[]
  ratePerMinute: number
  quotaPerDay: number
  revokedAt: string | null
  lastUsedAt: string | null
  createdAt: string
  requestsToday: number
}

interface FormState {
  name: string
  contact: string
  scopes: ApiScope[]
  ratePerMinute: string
  quotaPerDay: string
}

const EMPTY_FORM: FormState = { name: '', contact: '', scopes: ['orders:read'], ratePerMinute: '60', quotaPerDay: '5000' }

export function ApiKeysTab() {
  const t = useTranslations('admin')
  const tc = useTranslations('common')
  const format = useFormatter()

  const [builtins, setBuiltins] = useState<BuiltinView[]>([])
  const [keys, setKeys] = useState<KeyView[]>([])

  // Form dialog: `editing` null = create, otherwise the key being edited.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<KeyView | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)
  const [revoking, setRevoking] = useState<KeyView | null>(null)

  const [usageFor, setUsageFor] = useState<{ id: string; name: string } | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)

  // The EXTERNAL_API_KEY card, moved here from SettingsTab.
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [endpoints, setEndpoints] = useState<{ method: string; path: string }[]>([])

  const fetchApiKey = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/api-key')
      const data = await res.json()
      setApiKeyConfigured(data.configured)
      if (data.configured) {
        setApiKey(data.apiKey)
      }
    } catch (error) {
      console.error('Failed to fetch API key:', error)
    }
  }, [])

  /**
   * The endpoints this key unlocks, taken from the OpenAPI document.
   *
   * Reading them here means the card cannot fall out of step with the API the
   * way a hand-kept list did. A failure is not worth reporting: the list is
   * supporting detail beside a link to the full documentation, so it simply
   * does not render.
   */
  const fetchEndpoints = useCallback(async () => {
    try {
      const res = await fetch('/api/api-docs')
      if (!res.ok) return
      const spec = await res.json()
      const base = '/api/v1'
      const rows: { method: string; path: string }[] = []
      for (const [path, ops] of Object.entries(spec.paths ?? {})) {
        // The /tost/ routes are in the same document but behind a different
        // secret (TOST_API_KEY, not EXTERNAL_API_KEY). Listing them under this
        // key would promise access it does not grant.
        if (path.startsWith('/tost/')) continue
        for (const method of Object.keys(ops as object)) {
          if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue
          rows.push({ method: method.toUpperCase(), path: base + path })
        }
      }
      setEndpoints(rows.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method)))
    } catch {
      // leaves the list empty, which hides it
    }
  }, [])

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/api-keys')
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setBuiltins(data.builtins)
      setKeys(data.keys)
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
      toast.error(t('apiKeysLoadFailed'))
    }
  }, [t])

  useEffect(() => {
    fetchKeys()
    fetchApiKey()
    fetchEndpoints()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!usageFor) return
    setUsage(null)
    fetch(`/api/admin/api-keys/usage?consumer=${encodeURIComponent(usageFor.id)}&days=30`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(setUsage)
      .catch(error => {
        console.error('Failed to fetch API usage:', error)
        toast.error(t('apiKeysLoadFailed'))
      })
  }, [usageFor, t])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setFormOpen(true)
  }

  const openEdit = (key: KeyView) => {
    setEditing(key)
    setForm({
      name: key.name,
      contact: key.contact ?? '',
      scopes: key.scopes,
      ratePerMinute: String(key.ratePerMinute),
      quotaPerDay: String(key.quotaPerDay),
    })
    setFormErrors({})
    setFormOpen(true)
  }

  const toggleScope = (scope: ApiScope, checked: boolean) => {
    setForm(f => {
      let scopes = checked ? [...f.scopes, scope] : f.scopes.filter(s => s !== scope)
      // PII access is an addition to read access, never on its own.
      if (scope === 'orders:read:pii' && checked && !scopes.includes('orders:read')) scopes = [...scopes, 'orders:read']
      if (scope === 'orders:read' && !checked) scopes = scopes.filter(s => s !== 'orders:read:pii')
      return { ...f, scopes }
    })
  }

  const submitForm = async () => {
    setSaving(true)
    setFormErrors({})
    try {
      const body = {
        name: form.name,
        contact: form.contact,
        scopes: form.scopes,
        ratePerMinute: Number(form.ratePerMinute),
        quotaPerDay: Number(form.quotaPerDay),
      }
      const res = await fetch(editing ? `/api/admin/api-keys/${editing.id}` : '/api/admin/api-keys', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.details) setFormErrors(data.details)
        else toast.error(data.error ?? t('apiKeysSaveFailed'))
        return
      }
      setFormOpen(false)
      if (!editing) {
        setNewSecret(data.secret)
        setSecretCopied(false)
      } else {
        toast.success(t('apiKeysSaved'))
      }
      fetchKeys()
    } catch (error) {
      console.error('Failed to save API key:', error)
      toast.error(t('apiKeysSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const confirmRevoke = async () => {
    if (!revoking) return
    try {
      const res = await fetch(`/api/admin/api-keys/${revoking.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(String(res.status))
      toast.success(t('apiKeysRevoked'))
      fetchKeys()
    } catch (error) {
      console.error('Failed to revoke API key:', error)
      toast.error(t('apiKeysSaveFailed'))
    } finally {
      setRevoking(null)
    }
  }

  const scopeBadges = (scopes: ApiScope[]) => (
    <div className="flex flex-wrap gap-1">
      {scopes.map(s => <Badge key={s} variant="outline" className="font-mono text-xs">{s}</Badge>)}
    </div>
  )

  const dateTime = (iso: string | null) =>
    iso ? format.dateTime(new Date(iso), { dateStyle: 'medium', timeStyle: 'short' }) : t('apiKeysNever')

  return (
    <div className="space-y-6">
      {/* Consumers */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                {t('apiKeysTitle')}
              </CardTitle>
              <CardDescription>{t('apiKeysDescription')}</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('apiKeysCreate')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('apiKeysName')}</TableHead>
                  <TableHead>{t('apiKeysScopes')}</TableHead>
                  <TableHead>{t('apiKeysLimits')}</TableHead>
                  <TableHead>{t('apiKeysToday')}</TableHead>
                  <TableHead>{t('apiKeysLastUsed')}</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {builtins.map(b => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-muted-foreground">
                        <Badge variant="secondary" className="mr-1">{t('apiKeysBuiltin')}</Badge>
                        <span className="font-mono">{b.envVar}</span>
                        {!b.configured && <span className="ml-1 text-destructive">{t('apiKeysNotSet')}</span>}
                      </div>
                    </TableCell>
                    <TableCell>{scopeBadges(b.scopes)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t('apiKeysUnlimited')}</TableCell>
                    <TableCell className="tabular-nums">{b.requestsToday}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">—</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setUsageFor({ id: b.id, name: b.name })} aria-label={t('apiKeysUsage')}>
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {keys.map(k => (
                  <TableRow key={k.id} className={k.revokedAt ? 'text-muted-foreground' : undefined}>
                    <TableCell>
                      <div className="font-medium">{k.name}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono">{k.keyPrefix}…</span>
                        {k.contact && <span className="ml-2">{k.contact}</span>}
                        {k.revokedAt && <Badge variant="outline" className="ml-2 border-destructive text-destructive">{t('apiKeysRevokedBadge')}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{scopeBadges(k.scopes)}</TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {t('apiKeysLimitValues', { perMinute: k.ratePerMinute, perDay: k.quotaPerDay })}
                    </TableCell>
                    <TableCell className="tabular-nums">{k.requestsToday} / {k.quotaPerDay}</TableCell>
                    <TableCell className="text-sm">{dateTime(k.lastUsedAt)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => setUsageFor({ id: k.id, name: k.name })} aria-label={t('apiKeysUsage')}>
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      {!k.revokedAt && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(k)} aria-label={tc('edit')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setRevoking(k)} aria-label={t('apiKeysRevoke')}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {keys.length === 0 && <p className="mt-4 text-sm text-muted-foreground">{t('apiKeysEmpty')}</p>}
        </CardContent>
      </Card>

      {/* Usage */}
      {usageFor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('apiKeysUsageTitle', { name: usageFor.name })}
            </CardTitle>
            <CardDescription>{t('apiKeysUsageDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!usage ? (
              <p className="text-sm text-muted-foreground">{tc('loading')}</p>
            ) : (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={usage.daily}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" tickFormatter={d => d.slice(5)} fontSize={12} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="requests" name={t('apiKeysRequests')} fill="var(--color-chart-1)" />
                      <Bar dataKey="errors" name={t('apiKeysErrors')} fill="var(--color-chart-3)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('apiKeysEndpoint')}</TableHead>
                        <TableHead className="text-right">{t('apiKeysRequests')}</TableHead>
                        <TableHead className="text-right">{t('apiKeysErrors')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usage.byEndpoint.map(e => (
                        <TableRow key={e.endpoint}>
                          <TableCell className="font-mono text-xs">{e.endpoint}</TableCell>
                          <TableCell className="text-right tabular-nums">{e.requests}</TableCell>
                          <TableCell className="text-right tabular-nums">{e.errors}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            {t('apiForDevelopers')}
          </CardTitle>
          <CardDescription>
            {t('apiDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKeyConfigured && apiKey ? (
            <>
              <div className="space-y-2">
                <Label>{t('apiKey')}</Label>
                <div className="flex gap-2">
                  {/* Hidden by default: the key was previously rendered in
                      plaintext on a page that gets screenshotted and screen-
                      shared. Copying still works without revealing it. */}
                  <Input
                    value={apiKey}
                    type={apiKeyVisible ? 'text' : 'password'}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setApiKeyVisible(v => !v)}
                    title={apiKeyVisible ? tc('hide') : tc('show')}
                    aria-label={apiKeyVisible ? tc('hide') : tc('show')}
                  >
                    {apiKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(apiKey)
                      setApiKeyCopied(true)
                      setTimeout(() => setApiKeyCopied(false), 2000)
                    }}
                    title={tc('copy')}
                  >
                    {apiKeyCopied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span className="sr-only">{tc('copy')}</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('apiKeyHint')}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/docs" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('apiDocs')}
                  </Link>
                </Button>
              </div>

              {endpoints.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                  <p><strong>{t('apiEndpoints')}</strong></p>
                  {/* Read from the OpenAPI document the docs page already
                      serves, rather than a copy kept by hand. The copy had
                      drifted — it was missing GET /orders/:id — and carried
                      German descriptions in an app that ships 23 languages.
                      Method and path need no translation; what each one does
                      is one click away in the docs linked above. */}
                  <ul className="list-disc list-inside ml-2 font-mono">
                    {endpoints.map(e => (
                      <li key={`${e.method} ${e.path}`}>{e.method} {e.path}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p>{t('apiNotConfigured')}</p>
              <p className="mt-2">
                {t('apiConfigHint', { envVar: 'EXTERNAL_API_KEY' })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Create / edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('apiKeysEditTitle') : t('apiKeysCreateTitle')}</DialogTitle>
            <DialogDescription>{t('apiKeysFormDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKeyName">{t('apiKeysName')}</Label>
              <Input id="apiKeyName" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKeyContact">{t('apiKeysContact')}</Label>
              <Input id="apiKeyContact" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
              {formErrors.contact && <p className="text-xs text-destructive">{formErrors.contact}</p>}
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t('apiKeysScopes')}</legend>
              {API_SCOPES.map(scope => (
                <div key={scope} className="flex items-start gap-2">
                  <Checkbox
                    id={`scope-${scope}`}
                    checked={form.scopes.includes(scope)}
                    onCheckedChange={c => toggleScope(scope, !!c)}
                  />
                  <Label htmlFor={`scope-${scope}`} className="font-normal leading-tight">
                    <span className="font-mono text-xs">{scope}</span>
                    <span className="block text-xs text-muted-foreground">{t(`apiScope_${scope.replace(/:/g, '_')}`)}</span>
                  </Label>
                </div>
              ))}
              {formErrors.scopes && <p className="text-xs text-destructive">{formErrors.scopes}</p>}
            </fieldset>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apiKeyRate">{t('apiKeysPerMinute')}</Label>
                <Input id="apiKeyRate" type="number" min={1} value={form.ratePerMinute} onChange={e => setForm(f => ({ ...f, ratePerMinute: e.target.value }))} />
                {formErrors.ratePerMinute && <p className="text-xs text-destructive">{formErrors.ratePerMinute}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKeyQuota">{t('apiKeysPerDay')}</Label>
                <Input id="apiKeyQuota" type="number" min={1} value={form.quotaPerDay} onChange={e => setForm(f => ({ ...f, quotaPerDay: e.target.value }))} />
                {formErrors.quotaPerDay && <p className="text-xs text-destructive">{formErrors.quotaPerDay}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={submitForm} disabled={saving}>{saving ? tc('saving') : tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* The secret, once */}
      <Dialog open={newSecret !== null} onOpenChange={open => { if (!open) setNewSecret(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('apiKeysSecretTitle')}</DialogTitle>
            <DialogDescription>{t('apiKeysSecretWarning')}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={newSecret ?? ''} className="font-mono text-xs" onFocus={e => e.target.select()} />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (!newSecret) return
                navigator.clipboard.writeText(newSecret)
                setSecretCopied(true)
              }}
              aria-label={t('apiKeysCopy')}
            >
              {secretCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>{t('apiKeysSecretDone')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <Dialog open={revoking !== null} onOpenChange={open => { if (!open) setRevoking(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('apiKeysRevokeTitle', { name: revoking?.name ?? '' })}</DialogTitle>
            <DialogDescription>{t('apiKeysRevokeWarning')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevoking(null)}>{tc('cancel')}</Button>
            <Button variant="destructive" onClick={confirmRevoke}>{t('apiKeysRevoke')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
