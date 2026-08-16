import { describe, it, expect } from 'vitest'
import { diffOrders, isBackupName, COMPARED_FIELDS } from './backup-diff'

type Row = Record<string, unknown>

const base: Row = {
  id: 'a1',
  name: 'Eljonjon',
  vehicleType: 'Model Y',
  model: 'performance',
  orderDate: '04.07.2026',
  deliveryDate: null,
}

describe('isBackupName', () => {
  it('accepts a name this app produced', () => {
    expect(isBackupName('backup-2026-08-15T11-45-00Z.db')).toBe(true)
  })

  it('refuses anything that could climb out of the backup directory', () => {
    // The name arrives in a URL, so it is the one part of a restore an outsider
    // could choose. Everything below has to fail before it reaches a path join.
    expect(isBackupName('../prod.db')).toBe(false)
    expect(isBackupName('backup-2026-08-15T11-45-00Z.db/../../etc/passwd')).toBe(false)
    expect(isBackupName('/etc/passwd')).toBe(false)
    expect(isBackupName('prod.db')).toBe(false)
    expect(isBackupName('backup-..-.db')).toBe(false)
    expect(isBackupName('')).toBe(false)
  })
})

describe('diffOrders', () => {
  it('reports an order that exists now and did not before', () => {
    const d = diffOrders([], [base])

    expect(d.added.map(o => o.id)).toEqual(['a1'])
    expect(d.removed).toEqual([])
    expect(d.changed).toEqual([])
  })

  it('reports an order that is gone', () => {
    const d = diffOrders([base], [])

    expect(d.removed.map(o => o.id)).toEqual(['a1'])
    expect(d.added).toEqual([])
  })

  it('reports which fields changed, and what they were', () => {
    const after = { ...base, deliveryDate: '20.08.2026', model: 'premium' }

    const d = diffOrders([base], [after])

    expect(d.changed).toHaveLength(1)
    expect(d.changed[0].id).toBe('a1')
    expect(d.changed[0].fields).toEqual(
      expect.arrayContaining([
        { field: 'deliveryDate', from: null, to: '20.08.2026' },
        { field: 'model', from: 'performance', to: 'premium' },
      ]),
    )
    expect(d.changed[0].fields).toHaveLength(2)
  })

  it('says nothing about an order nobody touched', () => {
    const d = diffOrders([base], [{ ...base }])

    expect(d.added).toEqual([])
    expect(d.removed).toEqual([])
    expect(d.changed).toEqual([])
  })

  it('ignores a timestamp that moves on its own', () => {
    // updatedAt changes whenever anything else does, so reporting it turns every
    // real change into two and every no-op save into a finding.
    const d = diffOrders(
      [{ ...base, updatedAt: '2026-08-01T00:00:00Z' }],
      [{ ...base, updatedAt: '2026-08-15T00:00:00Z' }],
    )

    expect(d.changed).toEqual([])
  })

  it('never reports a credential, changed or not', () => {
    // An admin comparing backups has no business reading someone's edit code,
    // and a diff is exactly the place a hash would otherwise be printed twice.
    const d = diffOrders(
      [{ ...base, editCode: '$2b$10$oldhash', resetCode: '111111' }],
      [{ ...base, editCode: '$2b$10$newhash', resetCode: '222222' }],
    )

    expect(d.changed).toEqual([])
    expect(COMPARED_FIELDS).not.toContain('editCode')
    expect(COMPARED_FIELDS).not.toContain('resetCode')
  })

  it('counts each order once, however many fields moved', () => {
    const after = { ...base, model: 'x', orderDate: '01.01.2026', vehicleType: 'Model 3' }

    const d = diffOrders([base], [after])

    expect(d.changed).toHaveLength(1)
    expect(d.changed[0].fields).toHaveLength(3)
  })
})

describe('the standalone script and the app agree on the filename', () => {
  it('accepts a name scripts/backup.mjs would write', async () => {
    // Two implementations of the same thing is how this codebase grew three
    // copies of its date parser that quietly disagreed. The runtime image ships
    // the Next bundle rather than an importable copy of the backup module, so
    // the cron script has to duplicate the naming — and this fails CI if the two
    // ever drift, rather than producing snapshots the app cannot list.
    const { readFile } = await import('node:fs/promises')
    const script = await readFile('scripts/backup.mjs', 'utf8')

    const literal = script.match(/const BACKUP_NAME = (\/.*\/)\n/)?.[1]
    expect(literal, 'BACKUP_NAME not found in scripts/backup.mjs').toBeTruthy()

    const stamp = new Date('2026-08-15T13:31:16.110Z')
      .toISOString().replace(/\.\d+Z$/, 'Z').replace(/:/g, '-')
    const produced = `backup-${stamp}.db`

    expect(produced).toBe('backup-2026-08-15T13-31-16Z.db')
    expect(isBackupName(produced)).toBe(true)
    expect(new RegExp(literal!.slice(1, -1)).test(produced)).toBe(true)
  })
})
