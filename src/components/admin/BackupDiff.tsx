'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { RotateCcw, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrderDiff } from '@/lib/backup-diff'
import {
  toRows, filterRows, changedFieldCounts, type DiffKind, type SortKey,
} from '@/lib/backup-diff-view'

/** Empty, null and undefined all mean "nothing here" to a reader. */
function show(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? '✓' : '—'
  return String(value)
}

/**
 * A comparison, made workable.
 *
 * The first real sync produced 359 entries. Three flat lists of that length
 * answer no question anybody actually has — so this is one list, searchable by
 * name, by field name and by the values on either side of a change, narrowable
 * to a kind or a single field, and rankable by how much moved.
 */
export function BackupDiff({
  diff,
  busyId,
  onRestore,
}: {
  diff: OrderDiff
  busyId: string | null
  onRestore: (id: string, name: string) => void
}) {
  const t = useTranslations('admin')
  const tc = useTranslations('common')

  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<DiffKind | 'all'>('all')
  const [field, setField] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('name')

  const rows = useMemo(() => toRows(diff), [diff])
  const fields = useMemo(() => changedFieldCounts(diff), [diff])
  const shown = useMemo(
    () => filterRows(rows, { query, kind, field, sort }),
    [rows, query, kind, field, sort],
  )

  const narrowed = query !== '' || kind !== 'all' || field !== 'all'

  const kindLabel: Record<DiffKind, string> = {
    added: t('diffAdded'),
    removed: t('diffRemoved'),
    changed: t('diffChanged'),
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t('restoreHint')}</p>

      {/* A grid on a phone, a wrapping row from sm up. As a flex row the three
          selects shrank to 42px each — flex-1 with min-w-0 lets a control
          collapse below its own label, and all three did. */}
      <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
        <div className="relative col-span-2 sm:min-w-[12rem] sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tc('searchName')}
            className="h-9 pl-8 text-sm sm:h-8"
          />
        </div>

        <Select value={kind} onValueChange={v => setKind(v as DiffKind | 'all')}>
          <SelectTrigger className="h-9 w-full text-sm sm:h-8 sm:w-auto sm:min-w-[9rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc('all')}</SelectItem>
            <SelectItem value="changed">{t('diffChanged')} ({diff.changed.length})</SelectItem>
            <SelectItem value="removed">{t('diffRemoved')} ({diff.removed.length})</SelectItem>
            <SelectItem value="added">{t('diffAdded')} ({diff.added.length})</SelectItem>
          </SelectContent>
        </Select>

        {fields.length > 0 && (
          <Select value={field} onValueChange={setField}>
            <SelectTrigger className="h-9 w-full text-sm sm:h-8 sm:w-auto sm:min-w-[11rem]">
              <SelectValue placeholder={t('backupAllFields')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('backupAllFields')}</SelectItem>
              {fields.map(f => (
                <SelectItem key={f.field} value={f.field}>{f.field} ({f.count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={sort} onValueChange={v => setSort(v as SortKey)}>
          <SelectTrigger className="h-9 w-full text-sm sm:h-8 sm:w-auto sm:min-w-[10rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">{t('backupSortName')}</SelectItem>
            <SelectItem value="changes">{t('backupSortChanges')}</SelectItem>
          </SelectContent>
        </Select>

        {narrowed && (
          <Button
            variant="ghost"
            size="sm"
            className="col-span-2 h-9 sm:col-span-1 sm:h-8"
            onClick={() => { setQuery(''); setKind('all'); setField('all') }}
          >
            {tc('resetFilters')}
          </Button>
        )}
      </div>

      <p className="text-xs tabular-nums text-muted-foreground">
        {t('backupShowing', { shown: shown.length, total: rows.length })}
      </p>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('backupNoMatches')}</p>
      ) : (
        <ul className="grid gap-px overflow-hidden rounded-md border bg-border">
          {shown.map(row => (
            <li key={row.id} className="bg-card px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-[10px] font-normal',
                      row.kind === 'removed' && 'border-destructive/40 text-destructive',
                      row.kind === 'added' && 'border-success/40 text-success',
                    )}
                  >
                    {kindLabel[row.kind]}
                  </Badge>
                  <span className="truncate text-sm font-medium">{row.name}</span>
                </span>

                {row.kind !== 'added' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === row.id}
                    onClick={() => onRestore(row.id, row.name)}
                  >
                    {busyId === row.id
                      ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
                    {t('restoreOrder')}
                  </Button>
                )}
              </div>

              {row.fields.length > 0 && (
                /* Stacked on a phone, two columns from sm up. Side by side at
                   390px the field name took a fixed 9rem and left 163px for the
                   values, so "01.11.2026 - 31.12.2026" wrapped mid-date against
                   a column of names that had room to spare. */
                <dl className="mt-1.5 grid gap-1.5 text-xs sm:gap-0.5">
                  {row.fields.map(f => (
                    <div
                      key={f.field}
                      className="grid gap-0.5 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] sm:gap-2"
                    >
                      <dt className="truncate text-muted-foreground">{f.field}</dt>
                      <dd className="min-w-0 break-words">
                        <span className="text-muted-foreground line-through">{show(f.from)}</span>
                        <span className="mx-1.5 text-muted-foreground">→</span>
                        <span className="font-medium">{show(f.to)}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
