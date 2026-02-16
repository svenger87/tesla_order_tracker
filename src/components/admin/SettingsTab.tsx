'use client'

import { useState, useCallback, useEffect } from 'react'
import { Settings } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Save, Key, Heart, Archive, RotateCcw, AlertTriangle, Code2, Copy, Check, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export function SettingsTab() {
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

  // API Key state
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)

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

  useEffect(() => {
    fetchSettings().then((settingsData) => {
      if (settingsData) {
        fetchArchiveInfo(settingsData.archiveThreshold ?? 180)
      }
    }).finally(() => setLoading(false))
    fetchApiKey()
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

      if (!res.ok) throw new Error('Fehler beim Speichern')

      setMessage('Einstellungen gespeichert!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleBatchArchive = async () => {
    if (!settings) return
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
      if (!res.ok) throw new Error(data.error || 'Archivierung fehlgeschlagen')

      setArchiveMessage(`${data.count} Bestellungen archiviert`)
      await fetchArchiveInfo(settings.archiveThreshold)
      setTimeout(() => setArchiveMessage(''), 5000)
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Archivierung fehlgeschlagen')
    } finally {
      setArchiving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwörter stimmen nicht überein')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Passwort muss mindestens 6 Zeichen haben')
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
      if (!res.ok) throw new Error(data.error || 'Fehler beim Ändern des Passworts')

      setPasswordMessage('Passwort erfolgreich geändert!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordMessage(''), 3000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Fehler beim Ändern')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground p-4">Laden...</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Donation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Spendeneinstellungen
            </CardTitle>
            <CardDescription>
              Konfiguriere den Spenden-Banner auf der Hauptseite
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div className="bg-green-500/10 text-green-600 px-4 py-2 rounded-md text-sm">
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
              <Label htmlFor="showDonation">Spenden-Banner anzeigen</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="donationText">Banner-Text</Label>
              <Input
                id="donationText"
                value={settings?.donationText ?? ''}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, donationText: e.target.value } : null)
                }
                placeholder="Unterstütze dieses Projekt"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="donationUrl">Spenden-URL</Label>
              <Input
                id="donationUrl"
                value={settings?.donationUrl ?? ''}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, donationUrl: e.target.value } : null)
                }
                placeholder="https://paypal.me/yourusername"
              />
            </div>

            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Speichern...' : 'Speichern'}
            </Button>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Passwort ändern
            </CardTitle>
            <CardDescription>
              Ändere dein Admin-Passwort
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {passwordMessage && (
                <div className="bg-green-500/10 text-green-600 px-4 py-2 rounded-md text-sm">
                  {passwordMessage}
                </div>
              )}
              {passwordError && (
                <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
                  {passwordError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Neues Passwort</Label>
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
                <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
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
                {changingPassword ? 'Ändern...' : 'Passwort ändern'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              API für Entwickler
            </CardTitle>
            <CardDescription>
              API-Schlüssel für externen Zugriff auf die Daten
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {apiKeyConfigured && apiKey ? (
              <>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      value={apiKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(apiKey)
                        setApiKeyCopied(true)
                        setTimeout(() => setApiKeyCopied(false), 2000)
                      }}
                      title="Kopieren"
                    >
                      {apiKeyCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Diesen Key an Entwickler weitergeben, die die API nutzen möchten.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link href="/docs" target="_blank">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      API Dokumentation
                    </Button>
                  </Link>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                  <p><strong>Verfügbare Endpunkte:</strong></p>
                  <ul className="list-disc list-inside ml-2 font-mono">
                    <li>GET /api/v1/orders - Alle Bestellungen</li>
                    <li>GET /api/v1/orders/by-name/:name - Nach Name</li>
                    <li>POST /api/v1/orders - Neue Bestellung</li>
                    <li>PUT /api/v1/orders/:id - Bestellung aktualisieren</li>
                    <li>GET /api/v1/options - Dropdown-Optionen</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p>API Key nicht konfiguriert.</p>
                <p className="mt-2">
                  Setze <code className="bg-muted px-1 rounded">EXTERNAL_API_KEY</code> in den Umgebungsvariablen.
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
            Archiv-Verwaltung
          </CardTitle>
          <CardDescription>
            Archiviere inaktive Bestellungen, um die Statistiken sauber zu halten
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
            <Label htmlFor="archiveEnabled">Archivierung aktivieren</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSettings}
              disabled={saving}
              className="ml-2"
            >
              <Save className="h-4 w-4 mr-1" />
              Speichern
            </Button>
          </div>

          {settings?.archiveEnabled && (
            <>
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <AlertTriangle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-400">
                  <p className="font-medium">Info</p>
                  <p>
                    Diese Funktion archiviert nur <strong>unvollständige Bestellungen</strong> (ohne Lieferdatum),
                    die lange nicht aktualisiert wurden. Archivierte Einträge werden aus den öffentlichen
                    Statistiken ausgeblendet, bleiben aber in der Datenbank erhalten.
                  </p>
                </div>
              </div>

              {archiveMessage && (
                <div className="bg-green-500/10 text-green-600 px-4 py-2 rounded-md text-sm">
                  {archiveMessage}
                </div>
              )}
              {archiveError && (
                <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
                  {archiveError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="archiveThreshold">Schwellwert für &quot;inaktiv&quot; (Tage ohne Aktualisierung)</Label>
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
                    Speichern
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nur <strong>unvollständige</strong> Bestellungen (ohne Lieferdatum), die länger als {settings?.archiveThreshold ?? 180} Tage nicht aktualisiert wurden, werden archiviert. Bereits gelieferte Fahrzeuge bleiben immer sichtbar.
                </p>
              </div>

              {archiveInfo && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-md">
                  <div>
                    <p className="text-sm text-muted-foreground">Inaktive Bestellungen</p>
                    <p className="text-2xl font-bold text-amber-600">{archiveInfo.staleCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bereits archiviert</p>
                    <p className="text-2xl font-bold text-muted-foreground">{archiveInfo.archivedCount}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleBatchArchive}
                  disabled={archiving || !archiveInfo || archiveInfo.staleCount === 0}
                  variant="default"
                >
                  <Archive className={`h-4 w-4 mr-2 ${archiving ? 'animate-pulse' : ''}`} />
                  {archiving ? 'Archiviere...' : `${archiveInfo?.staleCount ?? 0} inaktive archivieren`}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchArchiveInfo(settings?.archiveThreshold ?? 180)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Aktualisieren
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Um archivierte Bestellungen zu sehen oder wiederherzustellen, nutze die API unter /api/orders?includeArchived=true
              </p>
            </>
          )}

          {!settings?.archiveEnabled && (
            <p className="text-sm text-muted-foreground">
              Archivierung ist deaktiviert. Aktiviere sie oben, um inaktive Bestellungen zu verwalten.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
