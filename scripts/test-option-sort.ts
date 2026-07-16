/**
 * Regression test for option sorting (run with: npx tsx scripts/test-option-sort.ts)
 *
 * Bug: deliveryLocation options were sorted by sortOrder, so admin-added
 * locations (Lyon, Maurepas, Toulon, Toulouse) landed at the end of the list
 * instead of being merged alphabetically.
 */
import assert from 'node:assert/strict'
import { compareOptions, compareOptionLabels, ALPHABETICAL_OPTION_TYPES } from '../src/lib/optionSort'

type TestOption = { type: string; label: string; sortOrder: number }

const opt = (type: string, label: string, sortOrder: number): TestOption => ({ type, label, sortOrder })

// 1. deliveryLocation: alphabetical, ignoring sortOrder.
// Real production data: the four French cities were appended with high /
// colliding sortOrder values (Toulouse=55 = Vamdrup=55, Lyon=58 = Warschau=58).
const locations = [
  opt('deliveryLocation', 'Valencia', 54),
  opt('deliveryLocation', 'Toulouse', 55),
  opt('deliveryLocation', 'Vamdrup', 55),
  opt('deliveryLocation', 'Toulon', 56),
  opt('deliveryLocation', 'Verona', 56),
  opt('deliveryLocation', 'Maurepas', 57),
  opt('deliveryLocation', 'Lyon', 58),
  opt('deliveryLocation', 'Warschau', 58),
  opt('deliveryLocation', 'Düsseldorf', 9),
]
assert.deepEqual(
  [...locations].sort(compareOptions).map(o => o.label),
  ['Düsseldorf', 'Lyon', 'Maurepas', 'Toulon', 'Toulouse', 'Valencia', 'Vamdrup', 'Verona', 'Warschau'],
  'deliveryLocation must be sorted alphabetically regardless of sortOrder'
)

// 2. country: alphabetical with German umlaut handling (unchanged behavior)
const countries = [
  opt('country', 'Polen', 3),
  opt('country', 'Österreich', 2),
  opt('country', 'Deutschland', 1),
  opt('country', 'Dänemark', 0),
]
assert.deepEqual(
  [...countries].sort(compareOptions).map(o => o.label),
  ['Dänemark', 'Deutschland', 'Österreich', 'Polen'],
  'country must be sorted alphabetically with de locale'
)

// 3. other types: sortOrder wins, label only breaks ties (unchanged behavior)
const wheels = [
  opt('wheels', 'Zephyr 21"', 0),
  opt('wheels', 'Gemini 19"', 1),
  opt('wheels', 'Apollo 20"', 1),
]
assert.deepEqual(
  [...wheels].sort(compareOptions).map(o => o.label),
  ['Zephyr 21"', 'Apollo 20"', 'Gemini 19"'],
  'non-alphabetical types must keep sortOrder ordering'
)

// 4. mixed list: grouped by type first
const mixed = [
  opt('deliveryLocation', 'Lyon', 58),
  opt('country', 'Deutschland', 1),
]
assert.deepEqual(
  [...mixed].sort(compareOptions).map(o => o.type),
  ['country', 'deliveryLocation'],
  'options must stay grouped by type'
)

// 5. helper set + label comparator
assert.ok(ALPHABETICAL_OPTION_TYPES.has('country'))
assert.ok(ALPHABETICAL_OPTION_TYPES.has('deliveryLocation'))
assert.ok(compareOptionLabels('Lyon', 'Maurepas') < 0)
assert.ok(compareOptionLabels('Ötztal', 'Paris') < 0, 'umlauts must sort like their base letter')

console.log('✅ All option sort tests passed')
