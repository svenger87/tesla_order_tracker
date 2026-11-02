import { describe, test, expect } from 'vitest'
import { editCodeError, editCodeMatches, hashEditCode } from './edit-code'

describe('editCodeError', () => {
  test('needs six characters and a digit', () => {
    expect(editCodeError('abc12')).toMatch(/6/)
    expect(editCodeError('abcdefg')).toMatch(/number/)
    expect(editCodeError('abcde1')).toBeNull()
  })
})

describe('editCodeMatches', () => {
  test('matches a bcrypt hash made by hashEditCode', async () => {
    const stored = await hashEditCode('secret1')
    expect(stored).toMatch(/^\$2/)
    expect(await editCodeMatches('secret1', stored)).toBe(true)
    expect(await editCodeMatches('secret2', stored)).toBe(false)
  })

  test('still matches codes stored in plain text before hashing', async () => {
    expect(await editCodeMatches('plain12', 'plain12')).toBe(true)
    expect(await editCodeMatches('plain13', 'plain12')).toBe(false)
  })

  test('an order without a code matches nothing', async () => {
    expect(await editCodeMatches('', null)).toBe(false)
    expect(await editCodeMatches('anything1', '')).toBe(false)
  })
})
