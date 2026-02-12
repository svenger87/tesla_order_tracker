'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Settings } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { LogOut, Save, Home, Key, Heart, RefreshCw, AlertTriangle, Database, Bug, Archive, RotateCcw, Download } from 'lucide-react'
import { SyncResult } from '@/lib/types'
import Link from 'next/link'
import { OptionsManager } from '@/components/admin/OptionsManager'

// Extended sync result type for multi-sheet sync
interface MultiSheetSyncResult extends SyncResult {
  sheets?: Array<SyncResult & { sheetLabel: string }>
}

export default function AdminDashboard() {
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

  // Sync state
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<MultiSheetSyncResult | null>(null)
  const [syncError, setSyncError] = useState('')
  const [syncMode, setSyncMode] = useState<'single' | 'all'>('single')

  // Debug state
  const [debugging, setDebugging] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [debugResult, setDebugResult] = useState<any>(null)

  // Archive state
  const [archiveInfo, setArchiveInfo] = useState<{ staleCount: number; archivedCount: number; thresholdDays: number } | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [archiveMessage, setArchiveMessage] = useState('')

  // Export state
  const [exporting, setExporting] = useState(false)
  const [archiveError, setArchiveError] = useState('')

  const router = useRouter()

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/check')
      if (!res.ok) {
        router.push('/admin/login')
        return false
      }
      return true
    } catch {
      router.push('/admin/login')
      return false
    }
  }, [router])

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

  useEffect(() => {
    checkAuth().then((authed) => {
      if (authed) {
        fetchSettings().then((settingsData) => {
          // Use the fetched settings threshold, not state
          if (settingsData) {
            fetchArchiveInfo(settingsData.archiveThreshold ?? 180)
          }
        }).finally(() => setLoading(false))
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

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

      if (!res.ok) {
        throw new Error('Fehler beim Speichern')
      }

      setMessage('Einstellungen gespeichert!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleDebugSheets = async () => {
    setDebugging(true)
    setDebugResult(null)
    try {
      const res = await fetch('/api/orders/debug-sheets')
      const data = await res.json()
      setDebugResult(data)
    } catch (err) {
      setDebugResult({ error: err instanceof Error ? err.message : 'Debug failed' })
    } finally {
      setDebugging(false)
    }
  }

  const handleSync = async (mode: 'single' | 'all' = 'single') => {
    setSyncing(true)
    setSyncResult(null)
    setSyncError('')
    setSyncMode(mode)

    try {
      const url = mode === 'all' ? '/api/orders/sync?all=true' : '/api/orders/sync'
      const res = await fetch(url, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Sync fehlgeschlagen')
      }

      setSyncResult(data)
      // Refresh settings to get updated sync time
      await fetchSettings()
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync fehlgeschlagen')
    } finally {
      setSyncing(false)
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

      if (!res.ok) {
        throw new Error(data.error || 'Archivierung fehlgeschlagen')
      }

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

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Ändern des Passworts')
      }

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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Verwalte Einstellungen und Bestellungen
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Zur Übersicht
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
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
        </div>

        {/* Google Sheet Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Google Sheet Sync
            </CardTitle>
            <CardDescription>
              Importiere Daten aus der Google Tabelle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                <p className="font-medium">Hinweis</p>
                <p>
                  Der Sync sollte normalerweise nur einmal durchgeführt werden, um die initialen Daten zu importieren.
                  Alle neuen Bestellungen werden über das Formular der App erfasst.
                </p>
              </div>
            </div>

            {settings?.lastSyncTime && (
              <div className="text-sm text-muted-foreground">
                Letzter Sync: {new Date(settings.lastSyncTime).toLocaleString('de-DE')}
                {settings.lastSyncCount !== null && ` (${settings.lastSyncCount} Einträge)`}
              </div>
            )}

            {syncError && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
                {syncError}
              </div>
            )}

            {syncResult && (
              <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-3 rounded-md text-sm space-y-2">
                <p className="font-medium">Sync abgeschlossen!</p>

                {/* Per-sheet results for multi-sheet sync */}
                {syncResult.sheets && syncResult.sheets.length > 0 && (
                  <div className="space-y-1">
                    {syncResult.sheets.map((sheet, i) => (
                      <div key={i} className="flex gap-4 text-xs bg-white/10 px-2 py-1 rounded">
                        <span className="font-medium min-w-24">{sheet.sheetLabel}:</span>
                        <span>+{sheet.created}</span>
                        <span>↻{sheet.updated}</span>
                        <span>⏭{sheet.skipped}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                <div className="flex gap-4 pt-1 border-t border-green-500/20">
                  <span>Neu: {syncResult.created}</span>
                  <span>Aktualisiert: {syncResult.updated}</span>
                  <span>Übersprungen: {syncResult.skipped}</span>
                </div>

                {syncResult.errors.length > 0 && (
                  <div className="mt-2 text-amber-600 dark:text-amber-400">
                    <p className="font-medium">Fehler:</p>
                    <ul className="list-disc list-inside">
                      {syncResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {syncResult.errors.length > 5 && (
                        <li>...und {syncResult.errors.length - 5} weitere</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => handleSync('single')} disabled={syncing} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing && syncMode === 'single' ? 'animate-spin' : ''}`} />
                {syncing && syncMode === 'single' ? 'Synchronisiere...' : 'Aktuelles Quartal'}
              </Button>
              <Button onClick={() => handleSync('all')} disabled={syncing} variant="default">
                <Database className={`h-4 w-4 mr-2 ${syncing && syncMode === 'all' ? 'animate-spin' : ''}`} />
                {syncing && syncMode === 'all' ? 'Synchronisiere alle...' : 'Alle Quartale (Initial-Import)'}
              </Button>
              <Button onClick={handleDebugSheets} disabled={debugging} variant="ghost" size="sm">
                <Bug className={`h-4 w-4 mr-2 ${debugging ? 'animate-pulse' : ''}`} />
                {debugging ? 'Prüfe...' : 'Debug Sheets'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              &quot;Alle Quartale&quot; importiert Q3 2025, Q4 2025 und das aktuelle Quartal.
            </p>

            {/* Debug Results */}
            {debugResult && (
              <div className="mt-4 p-3 bg-muted/50 rounded-md text-xs font-mono overflow-x-auto">
                <p className="font-bold mb-2">Sheet Debug Info:</p>
                {debugResult.error ? (
                  <p className="text-destructive">{debugResult.error}</p>
                ) : (
                  <div className="space-y-3">
                    {debugResult.sheets?.map((sheet: { label: string; gid: string; totalRows?: number; nonEmptyRows?: number; namesFound?: number; headerRow?: string[]; firstFewNames?: string[]; error?: string }, i: number) => (
                      <div key={i} className="border-b border-border pb-2">
                        <p className="font-semibold">{sheet.label} (GID: {sheet.gid})</p>
                        {sheet.error ? (
                          <p className="text-destructive">{sheet.error}</p>
                        ) : (
                          <>
                            <p>Zeilen: {sheet.totalRows} | Nicht-leer: {sheet.nonEmptyRows} | Namen gefunden: {sheet.namesFound}</p>
                            <p>Header: {sheet.headerRow?.slice(0, 5).join(', ')}...</p>
                            <p>Erste Namen: {sheet.firstFewNames?.join(', ') || 'keine'}</p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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
                    fetchArchiveInfo(settings?.archiveThreshold)
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

        {/* Options Manager */}
        <OptionsManager />

        {/* Excel Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Daten-Export
            </CardTitle>
            <CardDescription>
              Exportiere alle Daten und Statistiken als Excel-Datei (Exit-Plan)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Der Export enthält alle Bestellungen, Statistiken, Verteilungen und Dropdown-Optionen
              als vollständiges Backup. Perfekt als Exit-Plan falls die App nicht mehr gewartet werden kann.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Enthaltene Sheets:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li>Alle Bestellungen (Rohdaten)</li>
                <li>Statistik-Übersicht</li>
                <li>Modellverteilung</li>
                <li>Reichweitenverteilung</li>
                <li>Länderverteilung</li>
                <li>Farbverteilung</li>
                <li>Antriebsverteilung</li>
                <li>Felgenverteilung</li>
                <li>Bestellungen pro Monat</li>
                <li>Lieferungen pro Monat</li>
                <li>Dropdown-Optionen (Admin-Settings)</li>
              </ul>
            </div>
            <Button
              onClick={async () => {
                setExporting(true)
                try {
                  const res = await fetch('/api/admin/export')
                  if (!res.ok) throw new Error('Export fehlgeschlagen')
                  const blob = await res.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `Tesla_Order_Tracker_Export_${new Date().toISOString().split('T')[0]}.xlsx`
                  document.body.appendChild(a)
                  a.click()
                  window.URL.revokeObjectURL(url)
                  document.body.removeChild(a)
                } catch (err) {
                  console.error('Export error:', err)
                  alert('Export fehlgeschlagen')
                } finally {
                  setExporting(false)
                }
              }}
              disabled={exporting}
            >
              <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-bounce' : ''}`} />
              {exporting ? 'Exportiere...' : 'Excel Export herunterladen'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hinweis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Um Bestellungen zu bearbeiten oder zu löschen, gehe zur{' '}
              <Link href="/" className="text-primary hover:underline">
                Hauptseite
              </Link>
              . Als Admin siehst du dort die Bearbeitungs- und Lösch-Optionen in der Tabelle.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
