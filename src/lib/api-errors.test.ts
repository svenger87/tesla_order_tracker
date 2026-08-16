import { describe, test, expect } from 'vitest'
import { messageKeyForCode, API_ERROR_KEYS } from './api-errors'

describe('messageKeyForCode', () => {
  test('maps a code onto its translation key', () => {
    expect(messageKeyForCode('PASSWORD_NEEDS_DIGIT')).toBe('form.validation.passwordNeedsNumber')
  })

  test('reuses the existing validation keys where one already fits', () => {
    // No point inventing a second "password too short" string in 23 languages.
    expect(messageKeyForCode('PASSWORD_TOO_SHORT')).toBe('form.validation.passwordMinLength')
    expect(messageKeyForCode('NAME_TOO_SHORT')).toBe('form.validation.nameMinLength')
  })

  test('collapses the six ordering failures onto one message', () => {
    expect(messageKeyForCode('DELIVERY_BEFORE_ORDER')).toBe('errors.datesOutOfOrder')
    expect(messageKeyForCode('PAPERS_BEFORE_PRODUCTION')).toBe('errors.datesOutOfOrder')
    expect(messageKeyForCode('PRODUCTION_BEFORE_ORDER')).toBe('errors.datesOutOfOrder')
  })

  test('keeps the future order date separate, since the fix differs', () => {
    expect(messageKeyForCode('ORDER_DATE_IN_FUTURE')).toBe('errors.orderDateInFuture')
  })

  test('returns null for an unknown code so the caller can fall back', () => {
    expect(messageKeyForCode('SOMETHING_NEW')).toBeNull()
    expect(messageKeyForCode(undefined)).toBeNull()
  })

  test('every mapped key is either an errors.* or an existing namespace key', () => {
    for (const key of Object.values(API_ERROR_KEYS)) {
      expect(key).toMatch(/^(errors|form\.validation)\./)
    }
  })
})
