'use client'

import { useState, useCallback, useEffect } from 'react'
import { Settings, SyncResult } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, AlertTriangle, Database, Bug, Download } from 'lucide-react'

import { useTranslations } from 'next-intl'

interface MultiSheetSyncResult extends SyncResult {
  sheets?: Array<SyncResult & { sheetLabel: string }>
  vehicleType?: string
  message?: string
}

export function ImportExportTab() {
  const t = useTranslations('admin')
  const tc = useTranslations('common')
  const [settings, setSettings] = useState<Settings | null>(null)

  // Sync state
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<MultiSheetSyncResult | null>(null)
  const [syncError, setSyncError] = useState('')
  const [syncMode, setSyncMode] = useState<'single' | 'all' | 'm3'>('single')

  // Debug state
  const [debugging, setDebugging] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [debugResult, setDebugResult] = useState<any>(null)

  // Export state
  const [exporting, setExporting] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setSettings(data)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

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

  const handleSync = async (mode: 'single' | 'all' | 'm3' = 'single') => {
    setSyncing(true)
    setSyncResult(null)
    setSyncError('')
    setSyncMode(mode)

    try {
      let url: string
      if (mode === 'm3') {
        url = '/api/orders/sync-m3'
      } else if (mode === 'all') {
        url = '/api/orders/sync?all=true'
      } else {
        url = '/api/orders/sync'
      }
      const res = await fetch(url, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || t('syncFailed'))

      setSyncResult(data)
      await fetchSettings()
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : t('syncFailed'))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Google Sheet Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {t('googleSheetSync')}
          </CardTitle>
          <CardDescription>
            {t('importFromSheet')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-400">
              <p className="font-medium">Hinweis</p>
              <p>
                {t('syncNote')}
              </p>
            </div>
          </div>

          {settings?.lastSyncTime && (
            <div className="text-sm text-muted-foreground">
              {t('lastSync', { time: new Date(settings.lastSyncTime).toLocaleString('de-DE') })}
              {settings.lastSyncCount !== null && ` ${t('lastSyncCount', { count: settings.lastSyncCount })}`}
            </div>
          )}

          {syncError && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
              {syncError}
            </div>
          )}

          {syncResult && (
            <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-3 rounded-md text-sm space-y-2">
              <p className="font-medium">
                {syncResult.message || t('syncCompleted')}
                {syncResult.vehicleType && <span className="ml-2 px-2 py-0.5 bg-green-500/20 rounded text-xs">{syncResult.vehicleType}</span>}
              </p>

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

              <div className="flex gap-4 pt-1 border-t border-green-500/20">
                <span>{tc('new')}: {syncResult.created}</span>
                <span>{tc('update')}: {syncResult.updated}</span>
                <span>Skipped: {syncResult.skipped}</span>
              </div>

              {syncResult.errors.length > 0 && (
                <div className="mt-2 text-amber-600 dark:text-amber-400">
                  <p className="font-medium">{tc('error')}:</p>
                  <ul className="list-disc list-inside">
                    {syncResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {syncResult.errors.length > 5 && (
                      <li>...+{syncResult.errors.length - 5}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">{t('modelYSection')}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => handleSync('single')} disabled={syncing} variant="outline">
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing && syncMode === 'single' ? 'animate-spin' : ''}`} />
                  {syncing && syncMode === 'single' ? t('syncing') : t('currentQuarter')}
                </Button>
                <Button onClick={() => handleSync('all')} disabled={syncing} variant="default">
                  <Database className={`h-4 w-4 mr-2 ${syncing && syncMode === 'all' ? 'animate-spin' : ''}`} />
                  {syncing && syncMode === 'all' ? t('syncingAll') : t('allQuarters')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('allQuartersHint')}
              </p>
            </div>

            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">{t('model3Section')}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => handleSync('m3')} disabled={syncing} variant="secondary">
                  <Database className={`h-4 w-4 mr-2 ${syncing && syncMode === 'm3' ? 'animate-spin' : ''}`} />
                  {syncing && syncMode === 'm3' ? t('syncingModel3') : t('importModel3')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('model3Hint')}
              </p>
            </div>

            <div className="border-t pt-3">
              <Button onClick={handleDebugSheets} disabled={debugging} variant="ghost" size="sm">
                <Bug className={`h-4 w-4 mr-2 ${debugging ? 'animate-pulse' : ''}`} />
                {debugging ? t('debugChecking') : t('debugSheets')}
              </Button>
            </div>
          </div>

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

      {/* Excel Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('dataExport')}
          </CardTitle>
          <CardDescription>
            {t('dataExportDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('exportDescription')}
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>{t('exportSheets')}</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>{t('exportAllOrders')}</li>
              <li>{t('exportStatOverview')}</li>
              <li>{t('exportModels')}</li>
              <li>{t('exportRanges')}</li>
              <li>{t('exportCountries')}</li>
              <li>{t('exportColors')}</li>
              <li>{t('exportDrives')}</li>
              <li>{t('exportWheels')}</li>
              <li>{t('exportOrdersPerMonth')}</li>
              <li>{t('exportDeliveriesPerMonth')}</li>
              <li>{t('exportOptions')}</li>
            </ul>
          </div>
          <Button
            onClick={async () => {
              setExporting(true)
              try {
                const res = await fetch('/api/admin/export')
                if (!res.ok) throw new Error(t('exportFailed'))
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
                alert(t('exportFailed'))
              } finally {
                setExporting(false)
              }
            }}
            disabled={exporting}
          >
            <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-bounce' : ''}`} />
            {exporting ? t('exporting') : t('downloadExport')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
