import { describe, test, expect } from 'vitest'
import { parseScopes, serializeScopes, parseApiKeyInput, isApiScope } from './api-scopes'

describe('scopes', () => {
  test('recognises known scopes only', () => {
    expect(isApiScope('orders:read')).toBe(true)
    expect(isApiScope('orders:delete')).toBe(false)
  })

  test('parses the stored comma list and drops unknown entries', () => {
    expect(parseScopes('orders:read, options:read,bogus')).toEqual(['orders:read', 'options:read'])
    expect(parseScopes('')).toEqual([])
  })

  test('serializes in canonical order without duplicates', () => {
    expect(serializeScopes(['options:read', 'orders:read', 'options:read'])).toBe('orders:read,options:read')
  })
})

describe('parseApiKeyInput', () => {
  const valid = { name: 'Canada tracker', contact: 'dev@example.com', scopes: ['orders:read', 'options:read'] }

  test('accepts a minimal create body and trims', () => {
    const r = parseApiKeyInput({ ...valid, name: '  Canada tracker  ' }, 'create')
    expect(r).toEqual({ ok: true, value: { name: 'Canada tracker', contact: 'dev@example.com', scopes: ['orders:read', 'options:read'] } })
  })

  test('requires name and scopes on create', () => {
    const r = parseApiKeyInput({}, 'create')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['name', 'scopes'])
  })

  test('update accepts a partial body', () => {
    expect(parseApiKeyInput({ quotaPerDay: 100 }, 'update')).toEqual({ ok: true, value: { quotaPerDay: 100 } })
  })

  test('rejects unknown scopes', () => {
    const r = parseApiKeyInput({ ...valid, scopes: ['orders:read', 'admin'] }, 'create')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.scopes).toMatch(/admin/)
  })

  test('rejects an empty scope list', () => {
    expect(parseApiKeyInput({ ...valid, scopes: [] }, 'create').ok).toBe(false)
  })

  test('rejects orders:read:pii without orders:read', () => {
    const r = parseApiKeyInput({ ...valid, scopes: ['orders:read:pii'] }, 'create')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.scopes).toMatch(/orders:read/)
  })

  test('rejects non-positive or fractional limits', () => {
    expect(parseApiKeyInput({ ratePerMinute: 0 }, 'update').ok).toBe(false)
    expect(parseApiKeyInput({ quotaPerDay: 1.5 }, 'update').ok).toBe(false)
    expect(parseApiKeyInput({ ratePerMinute: 10_001 }, 'update').ok).toBe(false)
  })

  test('turns an empty contact into null', () => {
    expect(parseApiKeyInput({ contact: '  ' }, 'update')).toEqual({ ok: true, value: { contact: null } })
  })

  test('rejects a non-object body', () => {
    expect(parseApiKeyInput(null, 'update').ok).toBe(false)
    expect(parseApiKeyInput('x', 'update').ok).toBe(false)
  })
})
