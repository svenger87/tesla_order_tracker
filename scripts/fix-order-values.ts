/**
 * One-off data repairs, kept as a script rather than as permanent API routes.
 *
 * These corrections existed as POST /api/admin/fix-order-values, /fix-wheels
 * and /fix-constraints — endpoints written for a single migration, never called
 * by the admin UI, and left mounted in the production router ever since. They
 * only ever needed to run once per environment.
 *
 *   npx tsx scripts/fix-order-values.ts          # report what would change
 *   npx tsx scripts/fix-order-values.ts --apply  # write the changes
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
})
const prisma = new PrismaClient({ adapter })

const APPLY = process.argv.includes('--apply')

/** Display labels that were stored where an internal value belonged. */
const VALUE_FIXES: Record<string, Record<string, string>> = {
  color: {
    'Pearl White': 'pearl_white',
    'Solid Black': 'solid_black',
    'Diamond Black': 'diamond_black',
    'Stealth Grey': 'stealth_grey',
    Quicksilver: 'quicksilver',
    'Ultra Red': 'ultra_red',
    'Glacier Blue': 'glacier_blue',
    'Marine Blue': 'marine_blue',
    'Deep Blue Metallic': 'deep_blue',
    'Midnight Cherry Red': 'midnight_cherry',
  },
  interior: { Schwarz: 'black', 'Weiß': 'white', Black: 'black', White: 'white' },
  autopilot: {
    Kein: 'none', FSD: 'fsd', EAP: 'eap', AP: 'ap',
    'FSD Transfer': 'fsd_transfer', 'EAP Transfer': 'eap_transfer',
  },
  towHitch: { Ja: 'ja', Nein: 'nein', 'n.v.': 'nv', '-': 'nv' },
  country: {
    '🇦🇹 Österreich': 'at', '🇩🇪 Deutschland': 'de', '🇨🇭 Schweiz': 'ch',
    'Österreich': 'at', Deutschland: 'de', Schweiz: 'ch',
  },
}

/** Constraint values renamed after the option keys were normalised. */
const CONSTRAINT_VALUE_FIXES: Record<string, string> = {
  max: 'maximale_reichweite',
  max_reichweite: 'maximale_reichweite',
}
const CONSTRAINT_SOURCE_FIXES: Record<string, string> = {
  performance_m3: 'performance',
}

const WHEEL_LABELS = [
  { value: '18', label: '18"' },
  { value: '19', label: '19"' },
  { value: '20', label: '20"' },
  { value: '21', label: '21"' },
]

async function fixOrders() {
  const orders = await prisma.order.findMany()
  let changed = 0

  for (const order of orders) {
    const updates: Record<string, string> = {}
    for (const [field, mapping] of Object.entries(VALUE_FIXES)) {
      const current = (order as unknown as Record<string, unknown>)[field] as string | null
      if (!current) continue
      const fixed = mapping[current]
      if (fixed) {
        updates[field] = fixed
        console.log(`  order ${order.name}: ${field} "${current}" -> "${fixed}"`)
      }
    }
    if (Object.keys(updates).length === 0) continue
    changed++
    if (APPLY) await prisma.order.update({ where: { id: order.id }, data: updates })
  }
  console.log(`orders: ${changed} affected`)
}

async function fixConstraints() {
  const constraints = await prisma.optionConstraint.findMany()
  let changed = 0

  for (const constraint of constraints) {
    let values = JSON.parse(constraint.values)
    let sourceValue = constraint.sourceValue
    let dirty = false

    if (CONSTRAINT_SOURCE_FIXES[sourceValue]) {
      console.log(`  constraint ${constraint.id}: sourceValue ${sourceValue} -> ${CONSTRAINT_SOURCE_FIXES[sourceValue]}`)
      sourceValue = CONSTRAINT_SOURCE_FIXES[sourceValue]
      dirty = true
    }
    if (typeof values === 'string' && CONSTRAINT_VALUE_FIXES[values]) {
      console.log(`  constraint ${constraint.id}: value ${values} -> ${CONSTRAINT_VALUE_FIXES[values]}`)
      values = CONSTRAINT_VALUE_FIXES[values]
      dirty = true
    } else if (Array.isArray(values)) {
      const next = values.map((v) => CONSTRAINT_VALUE_FIXES[v] || v)
      if (JSON.stringify(next) !== JSON.stringify(values)) {
        console.log(`  constraint ${constraint.id}: ${JSON.stringify(values)} -> ${JSON.stringify(next)}`)
        values = next
        dirty = true
      }
    }

    if (!dirty) continue
    changed++
    if (APPLY) {
      await prisma.optionConstraint.update({
        where: { id: constraint.id },
        data: { sourceValue, values: JSON.stringify(values) },
      })
    }
  }
  console.log(`constraints: ${changed} affected`)
}

async function fixWheelLabels() {
  let changed = 0
  for (const { value, label } of WHEEL_LABELS) {
    const matches = await prisma.option.findMany({ where: { type: 'wheels', value } })
    const wrong = matches.filter((o) => o.label !== label)
    for (const option of wrong) {
      console.log(`  wheels ${value}: "${option.label}" -> "${label}"`)
      changed++
      if (APPLY) await prisma.option.update({ where: { id: option.id }, data: { label } })
    }
  }
  console.log(`wheel labels: ${changed} affected`)
}

async function main() {
  console.log(APPLY ? 'Applying fixes.\n' : 'Dry run — pass --apply to write.\n')
  await fixOrders()
  await fixConstraints()
  await fixWheelLabels()
  if (!APPLY) console.log('\nNothing written. Re-run with --apply.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
