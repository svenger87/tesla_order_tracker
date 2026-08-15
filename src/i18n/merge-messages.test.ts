import { describe, it, expect } from 'vitest'
import { mergeMessages } from './merge-messages'

describe('mergeMessages', () => {
  it('keeps the translation where one exists', () => {
    const merged = mergeMessages(
      { common: { save: 'Speichern' } },
      { common: { save: 'Enregistrer' } },
    )
    expect(merged.common).toEqual({ save: 'Enregistrer' })
  })

  it('falls back to the source string for a key the translation lacks', () => {
    // The case this exists for: a key added to the source file is live before
    // Crowdin has carried it to the other 21 languages, and without a fallback
    // next-intl renders the key path — "errors.pageNotFoundTitle" as a headline.
    const merged = mergeMessages(
      { errors: { known: 'Bekannt', fresh: 'Neu' } },
      { errors: { known: 'Known' } },
    )
    expect(merged.errors).toEqual({ known: 'Known', fresh: 'Neu' })
  })

  it('merges namespace by namespace rather than replacing whole ones', () => {
    const merged = mergeMessages(
      { a: { x: '1' }, b: { y: '2' } },
      { a: { x: 'eins' } },
    )
    expect(merged).toEqual({ a: { x: 'eins' }, b: { y: '2' } })
  })

  it('reaches nested groups', () => {
    const merged = mergeMessages(
      { form: { validation: { required: 'Pflichtfeld', tooShort: 'Zu kurz' } } },
      { form: { validation: { required: 'Required' } } },
    )
    expect(merged.form).toEqual({
      validation: { required: 'Required', tooShort: 'Zu kurz' },
    })
  })

  it('lets a translation add a key the source does not have', () => {
    const merged = mergeMessages({ a: { x: '1' } }, { a: { z: '9' } })
    expect(merged.a).toEqual({ x: '1', z: '9' })
  })

  it('does not mutate either input', () => {
    const base = { a: { x: '1' } }
    const over = { a: { x: '2' } }
    mergeMessages(base, over)
    expect(base).toEqual({ a: { x: '1' } })
    expect(over).toEqual({ a: { x: '2' } })
  })

  it('prefers an empty translation string over the source', () => {
    // An empty string is a deliberate translation, not a missing one.
    const merged = mergeMessages({ a: { x: 'Text' } }, { a: { x: '' } })
    expect(merged.a).toEqual({ x: '' })
  })
})
