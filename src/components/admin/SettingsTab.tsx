'use client'

import { useState, useCallback, useEffect } from 'react'
import { Settings } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Save, Key, Heart, Archive, RotateCcw, AlertTriangle, Code2, Copy, Check, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

export function SettingsTab() {
  const t = useTranslations('admin')
  const tc = useTranslations('common')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Archive state
  const [archiveInfo, setArchiveInfo] = useState<{ staleCount: number; archivedCount: number; thresholdDays: number } | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [archiveMessage, setArchiveMessage] = useState('')
  const [archiveError, setArchiveError] = useState('')
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)

  // API Key state
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [endpoints, setEndpoints] = useState<{ method: string; path: string }[]>([])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setSettings(data)
      return data
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      return null
    }
  }, [])

  const fetchArchiveInfo = useCallback(async (threshold: number) => {
    try {
      const res = await fetch(`/api/orders/archive?thresholdDays=${threshold}`)
      const data = await res.json()
      setArchiveInfo(data)
    } catch (error) {
      console.error('Failed to fetch archive info:', error)
    }
  }, [])

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

  useEffect(() => {
    fetchSettings().then((settingsData) => {
      if (settingsData) {
        fetchArchiveInfo(settingsData.archiveThreshold ?? 180)
      }
    }).finally(() => setLoading(false))
    fetchApiKey()
    fetchEndpoints()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveSettings = async () => {
    if (!settings) return
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!res.ok) throw new Error(tc('error'))

      setMessage(t('settingsSaved'))
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setSaving(false)
    }
  }

  const handleBatchArchive = async () => {
    if (!settings) return
    setArchiveConfirmOpen(false)
    setArchiving(true)
    setArchiveMessage('')
    setArchiveError('')

    try {
      const res = await fetch('/api/orders/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thresholdDays: settings.archiveThreshold }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('archiveFailed'))

      setArchiveMessage(t('ordersArchived', { count: data.count }))
      await fetchArchiveInfo(settings.archiveThreshold)
      setTimeout(() => setArchiveMessage(''), 5000)
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : t('archiveFailed'))
    } finally {
      setArchiving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordMismatch'))
      return
    }

    if (newPassword.length < 6) {
      setPasswordError(t('passwordMinLength'))
      return
    }

    setChangingPassword(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || tc('error'))

      setPasswordMessage(t('passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordMessage(''), 3000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground p-4">{tc('loading')}</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Donation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              {t('donationSettings')}
            </CardTitle>
            <CardDescription>
              {t('donationDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div className="bg-success/10 text-success px-4 py-2 rounded-md text-sm">
                {message}
              </div>
            )}
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showDonation"
                checked={settings?.showDonation ?? true}
                onCheckedChange={(checked) =>
                  setSettings((s) => s ? { ...s, showDonation: !!checked } : null)
                }
              />
              <Label htmlFor="showDonation">{t('showDonationBanner')}</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="donationText">{t('bannerText')}</Label>
              <Input
                id="donationText"
                value={settings?.donationText ?? ''}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, donationText: e.target.value } : null)
                }
                placeholder={t('bannerTextPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="donationUrl">{t('donationUrl')}</Label>
              <Input
                id="donationUrl"
                value={settings?.donationUrl ?? ''}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, donationUrl: e.target.value } : null)
                }
                placeholder={t('donationUrlPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paypalUrl">PayPal URL</Label>
              <Input
                id="paypalUrl"
                value={settings?.paypalUrl ?? ''}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, paypalUrl: e.target.value } : null)
                }
                placeholder="https://paypal.me/..."
              />
            </div>

            {/* These two feed the cost bar in the footer. The columns existed in
                the database for months with nothing reading or writing them, so
                the bar could never be switched on. Empty means off. */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="yearlyGoal">{t('yearlyGoal')}</Label>
                <Input
                  id="yearlyGoal"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={settings?.yearlyGoal ?? ''}
                  onChange={(e) =>
                    setSettings((s) => s ? { ...s, yearlyGoal: e.target.value === '' ? null : Number(e.target.value) } : null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearlyRaised">{t('yearlyRaised')}</Label>
                <Input
                  id="yearlyRaised"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={settings?.yearlyRaised ?? ''}
                  onChange={(e) =>
                    setSettings((s) => s ? { ...s, yearlyRaised: e.target.value === '' ? null : Number(e.target.value) } : null)
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('yearlyGoalHint')}</p>

            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? tc('saving') : tc('save')}
            </Button>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {t('changePassword')}
            </CardTitle>
            <CardDescription>
              {t('changePasswordDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {passwordMessage && (
                <div className="bg-success/10 text-success px-4 py-2 rounded-md text-sm">
                  {passwordMessage}
                </div>
              )}
              {passwordError && (
                <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
                  {passwordError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={changingPassword}>
                <Key className="h-4 w-4 mr-2" />
                {changingPassword ? t('changingPassword') : t('changePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>

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
      </div>

      {/* Archive Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            {t('archiveManagement')}
          </CardTitle>
          <CardDescription>
            {t('archiveDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="archiveEnabled"
              checked={settings?.archiveEnabled ?? true}
              onCheckedChange={(checked) => {
                setSettings((s) => s ? { ...s, archiveEnabled: !!checked } : null)
              }}
            />
            <Label htmlFor="archiveEnabled">{t('enableArchive')}</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSettings}
              disabled={saving}
              className="ml-2"
            >
              <Save className="h-4 w-4 mr-1" />
              {tc('save')}
            </Button>
          </div>

          {settings?.archiveEnabled && (
            <>
              <div className="flex items-start gap-2 p-3 bg-data/10 border border-data/20 rounded-md">
                <AlertTriangle className="h-5 w-5 text-data shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-400">
                  <p className="font-medium">Info</p>
                  {/* Rendered as elements rather than injected as HTML: these
                      strings come from Crowdin, so they are content from outside
                      the codebase, and dangerouslySetInnerHTML would put whatever
                      a translation contains straight into the DOM. */}
                  <p>{t.rich('archiveInfo', { strong: (chunks) => <strong>{chunks}</strong> })}</p>
                </div>
              </div>

              {archiveMessage && (
                <div className="bg-success/10 text-success px-4 py-2 rounded-md text-sm">
                  {archiveMessage}
                </div>
              )}
              {archiveError && (
                <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
                  {archiveError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="archiveThreshold">{t('archiveThreshold')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="archiveThreshold"
                    type="number"
                    min="30"
                    max="365"
                    value={settings?.archiveThreshold ?? 180}
                    onChange={(e) => {
                      const value = Math.max(30, Math.min(365, parseInt(e.target.value) || 180))
                      setSettings((s) => s ? { ...s, archiveThreshold: value } : null)
                    }}
                    className="w-24"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await handleSaveSettings()
                      fetchArchiveInfo(settings?.archiveThreshold ?? 180)
                    }}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {tc('save')}
                  </Button>
                </div>
                {/* This one was visibly broken: the message carries a <strong>
                    tag, which next-intl treats as rich text needing a handler,
                    so plain t() failed and the paragraph showed the literal
                    string "admin.archiveThresholdDescription" to the admin. */}
                <p className="text-xs text-muted-foreground">
                  {t.rich('archiveThresholdDescription', {
                    days: settings?.archiveThreshold ?? 180,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
              </div>

              {archiveInfo && (
                <div className="grid grid-cols-2 gap-4 p-4 surface-subtle rounded-md">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('inactiveOrders')}</p>
                    <p className="text-2xl font-bold text-pending">{archiveInfo.staleCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('alreadyArchived')}</p>
                    <p className="text-2xl font-bold text-muted-foreground">{archiveInfo.archivedCount}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  // Asks first: this archives every stale order in one go — other
                  // people's entries — and there is no bulk way back, only one
                  // order at a time. Deleting an order already asks; this is the
                  // larger action of the two.
                  onClick={() => setArchiveConfirmOpen(true)}
                  disabled={archiving || !archiveInfo || archiveInfo.staleCount === 0}
                  variant="default"
                >
                  <Archive className={`h-4 w-4 mr-2 ${archiving ? 'animate-pulse' : ''}`} />
                  {archiving ? t('archiving') : t('archiveInactive', { count: archiveInfo?.staleCount ?? 0 })}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchArchiveInfo(settings?.archiveThreshold ?? 180)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {tc('refresh')}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {t('archiveApiHint')}
              </p>
            </>
          )}

          {!settings?.archiveEnabled && (
            <p className="text-sm text-muted-foreground">
              {t('archiveDisabledHint')}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('archiveConfirmTitle', { count: archiveInfo?.staleCount ?? 0 })}
            </DialogTitle>
            <DialogDescription>{t('archiveConfirmDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setArchiveConfirmOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleBatchArchive}>
              <Archive className="h-4 w-4 mr-2" />
              {t('archiveConfirmAction')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
