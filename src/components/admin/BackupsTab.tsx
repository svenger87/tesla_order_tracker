'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BackupDiff } from './BackupDiff'
import { Archive, Trash2, GitCompare, Loader2, Plus } from 'lucide-react'

type BackupInfo = { name: string; createdAt: string; bytes: number; orders: number }
type FieldChange = { field: string; from: unknown; to: unknown }
type Diff = {
  added: { id: string; name: string }[]
  removed: { id: string; name: string }[]
  changed: { id: string; name: string; fields: FieldChange[] }[]
}

function formatBytes(n: number): string {
  return `${(n / 1_048_576).toFixed(1)} MB`
}

function formatWhen(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}

export function BackupsTab({ locale }: { locale: string }) {
  const t = useTranslations('admin')
  const tc = useTranslations('common')

  const [backups, setBackups] = useState<BackupInfo[] | null>(null)
  const [keep, setKeep] = useState(20)
  const [creating, setCreating] = useState(false)
  const [openName, setOpenName] = useState<string | null>(null)
  const [diff, setDiff] = useState<Diff | null>(null)
  const [comparing, setComparing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/backups')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setBackups(data.backups)
      setKeep(data.keep ?? 20)
    } catch {
      setBackups([])
      toast.error(t('backupListFailed'))
    }
  }, [t])

  useEffect(() => { load() }, [load])

  async function create() {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/backups', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t('backupCreated'))
      await load()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t('backupFailed'))
    } finally {
      setCreating(false)
    }
  }

  const fetchDiff = useCallback(async (name: string) => {
    setComparing(true)
    setDiff(null)
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(name)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDiff(data.diff)
      return true
    } catch {
      toast.error(t('backupCompareFailed'))
      return false
    } finally {
      setComparing(false)
    }
  }, [t])

  async function toggleCompare(name: string) {
    if (openName === name) { setOpenName(null); setDiff(null); return }
    setOpenName(name)
    if (!(await fetchDiff(name))) setOpenName(null)
  }

  async function remove(name: string) {
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(name)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      if (openName === name) { setOpenName(null); setDiff(null) }
      toast.success(t('backupDeleted'))
      await load()
    } catch {
      toast.error(t('backupDeleteFailed'))
    }
  }

  async function restore(name: string, id: string, expectName: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(name)}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, expectName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t('orderRestored', { name: data.name }))
      // Re-read the comparison rather than toggling the panel twice: the row
      // just restored has to leave the list, and the panel has to stay open.
      await fetchDiff(name)
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t('restoreFailed'))
    } finally {
      setBusyId(null)
    }
  }

  const empty = diff && diff.added.length + diff.removed.length + diff.changed.length === 0

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              {t('backups')}
            </CardTitle>
            <CardDescription>{t('backupsDescription')}</CardDescription>
          </div>
          <Button onClick={create} disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {creating ? t('backupCreating') : t('createBackup')}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{t('backupKeepHint', { count: keep })}</p>

        {backups === null && (
          <p className="text-sm text-muted-foreground">{tc('loading')}</p>
        )}

        {backups?.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('noBackups')}</p>
        )}

        {backups && backups.length > 0 && (
          <ul className="grid gap-px overflow-hidden rounded-lg border bg-border">
            {backups.map(b => (
              <li key={b.name} className="bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{formatWhen(b.createdAt, locale)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {t('backupOrders', { count: b.orders })} · {formatBytes(b.bytes)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant={openName === b.name ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => toggleCompare(b.name)}
                    >
                      <GitCompare className="mr-1.5 h-3.5 w-3.5" />
                      {t('compareBackup')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(b.name)} aria-label={tc('delete')}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {openName === b.name && (
                  <div className="border-t bg-muted/30 px-3 py-3">
                    {comparing && <p className="text-sm text-muted-foreground">{t('backupComparing')}</p>}
                    {empty && <p className="text-sm text-muted-foreground">{t('noDifferences')}</p>}

                    {diff && !empty && (
                      <BackupDiff
                        diff={diff}
                        busyId={busyId}
                        onRestore={(id, name) => restore(b.name, id, name)}
                      />
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
