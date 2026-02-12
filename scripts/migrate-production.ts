/**
 * Production Migration Script for Model 3 Support
 *
 * This script runs AFTER merging to master and deploying to Vercel.
 * Vercel deployment will run Prisma migrations automatically.
 *
 * This script:
 * 1. Sets vehicleType='Model Y' for all existing orders (schema default handles this)
 * 2. Seeds the option constraints for Model 3
 * 3. Cleans up any duplicate options
 */

import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function migrateProduction() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN required')
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  console.log('Connected to production database')
  console.log('')

  // ============ STEP 1: Verify vehicleType column exists ============
  console.log('=== STEP 1: Check vehicleType column ===')

  try {
    const result = await client.execute('SELECT vehicleType FROM "Order" LIMIT 1')
    console.log('vehicleType column exists')

    // Check if any orders need vehicleType set
    const nullCount = await client.execute(
      'SELECT COUNT(*) as count FROM "Order" WHERE vehicleType IS NULL'
    )
    const count = nullCount.rows[0].count as number

    if (count > 0) {
      console.log(`Found ${count} orders with NULL vehicleType, setting to "Model Y"...`)
      await client.execute('UPDATE "Order" SET vehicleType = "Model Y" WHERE vehicleType IS NULL')
      console.log('Updated all orders to vehicleType="Model Y"')
    } else {
      console.log('All orders already have vehicleType set')
    }
  } catch (err) {
    console.log('vehicleType column does not exist yet - Prisma migration needed first!')
    console.log('Run: npx prisma migrate deploy')
    process.exit(1)
  }
  console.log('')

  // ============ STEP 2: Seed Option Constraints ============
  console.log('=== STEP 2: Seed Option Constraints ===')

  const constraints = [
    // Model 3 Hinterradantrieb
    { sourceValue: 'hinterradantrieb', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'fixed', values: '"18"' },
    { sourceValue: 'hinterradantrieb', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: '"standard"' },
    { sourceValue: 'hinterradantrieb', vehicleType: 'Model 3', targetType: 'drive', constraintType: 'fixed', values: '"rwd"' },
    { sourceValue: 'hinterradantrieb', vehicleType: 'Model 3', targetType: 'interior', constraintType: 'fixed', values: '"black"' },
    { sourceValue: 'hinterradantrieb', vehicleType: 'Model 3', targetType: 'color', constraintType: 'allow', values: '["pearl_white","diamond_black","stealth_grey"]' },

    // Model 3 Premium LR RWD
    { sourceValue: 'premium_lr_rwd', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'allow', values: '["18","19"]' },
    { sourceValue: 'premium_lr_rwd', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: '"maximale_reichweite"' },
    { sourceValue: 'premium_lr_rwd', vehicleType: 'Model 3', targetType: 'drive', constraintType: 'fixed', values: '"rwd"' },
    { sourceValue: 'premium_lr_rwd', vehicleType: 'Model 3', targetType: 'towHitch', constraintType: 'disable', values: '[]' },

    // Model 3 Premium LR AWD
    { sourceValue: 'premium_lr_awd', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'allow', values: '["18","19"]' },
    { sourceValue: 'premium_lr_awd', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: '"maximale_reichweite"' },
    { sourceValue: 'premium_lr_awd', vehicleType: 'Model 3', targetType: 'drive', constraintType: 'fixed', values: '"awd"' },
    { sourceValue: 'premium_lr_awd', vehicleType: 'Model 3', targetType: 'towHitch', constraintType: 'disable', values: '[]' },

    // Model 3 Performance
    { sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'fixed', values: '"20"' },
    { sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: '"maximale_reichweite"' },
    { sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'drive', constraintType: 'fixed', values: '"awd"' },
    { sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'towHitch', constraintType: 'disable', values: '[]' },

    // Model Y Standard
    { sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'range', constraintType: 'fixed', values: '"standard"' },
    { sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'wheels', constraintType: 'fixed', values: '"18"' },
    { sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'drive', constraintType: 'fixed', values: '"rwd"' },

    // Model Y Performance
    { sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'range', constraintType: 'fixed', values: '"maximale_reichweite"' },
    { sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'wheels', constraintType: 'fixed', values: '"21"' },
    { sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'drive', constraintType: 'fixed', values: '"awd"' },

    // Model Y Premium
    { sourceValue: 'premium', vehicleType: 'Model Y', targetType: 'wheels', constraintType: 'allow', values: '["19","20"]' },
  ]

  let constraintsCreated = 0
  let constraintsSkipped = 0

  for (const c of constraints) {
    // Check if constraint exists
    const existing = await client.execute({
      sql: 'SELECT id FROM OptionConstraint WHERE sourceType = "model" AND sourceValue = @sourceValue AND vehicleType = @vehicleType AND targetType = @targetType',
      args: { sourceValue: c.sourceValue, vehicleType: c.vehicleType, targetType: c.targetType },
    })

    if (existing.rows.length > 0) {
      constraintsSkipped++
      continue
    }

    // Create constraint
    const id = `constraint_${Date.now()}_${Math.random().toString(36).substring(7)}`
    await client.execute({
      sql: `INSERT INTO OptionConstraint (id, sourceType, sourceValue, vehicleType, targetType, constraintType, "values", isActive, createdAt, updatedAt)
            VALUES (@id, 'model', @sourceValue, @vehicleType, @targetType, @constraintType, @values, 1, datetime('now'), datetime('now'))`,
      args: {
        id,
        sourceValue: c.sourceValue,
        vehicleType: c.vehicleType,
        targetType: c.targetType,
        constraintType: c.constraintType,
        values: c.values,
      },
    })
    constraintsCreated++
    console.log(`  Created: ${c.vehicleType} ${c.sourceValue} -> ${c.targetType}`)
  }

  console.log(`Constraints: ${constraintsCreated} created, ${constraintsSkipped} skipped (already exist)`)
  console.log('')

  // ============ STEP 3: Add Model 3 Options ============
  console.log('=== STEP 3: Add Model 3 Options ===')

  const model3Options = [
    // Model 3 trims
    { type: 'model', value: 'hinterradantrieb', label: 'Hinterradantrieb', vehicleType: 'Model 3' },
    { type: 'model', value: 'premium_lr_rwd', label: 'Premium Maximale Reichweite RWD', vehicleType: 'Model 3' },
    { type: 'model', value: 'premium_lr_awd', label: 'Premium Maximale Reichweite AWD', vehicleType: 'Model 3' },
    { type: 'model', value: 'performance', label: 'Performance', vehicleType: 'Model 3' },
    // Model 3 wheels
    { type: 'wheels', value: '18', label: '18"', vehicleType: 'Model 3' },
    { type: 'wheels', value: '19', label: '19"', vehicleType: 'Model 3' },
    { type: 'wheels', value: '20', label: '20"', vehicleType: 'Model 3' },
    // Model Y trims (vehicle-specific)
    { type: 'model', value: 'standard', label: 'Standard', vehicleType: 'Model Y' },
    { type: 'model', value: 'premium', label: 'Premium', vehicleType: 'Model Y' },
    { type: 'model', value: 'performance', label: 'Performance', vehicleType: 'Model Y' },
    // Model Y wheels (vehicle-specific)
    { type: 'wheels', value: '18', label: '18"', vehicleType: 'Model Y' },
    { type: 'wheels', value: '19', label: '19"', vehicleType: 'Model Y' },
    { type: 'wheels', value: '20', label: '20"', vehicleType: 'Model Y' },
    { type: 'wheels', value: '21', label: '21"', vehicleType: 'Model Y' },
  ]

  let optionsCreated = 0
  let optionsSkipped = 0

  for (const opt of model3Options) {
    // Check if option exists
    const existing = await client.execute({
      sql: 'SELECT id FROM Option WHERE type = @type AND value = @value AND vehicleType = @vehicleType',
      args: { type: opt.type, value: opt.value, vehicleType: opt.vehicleType },
    })

    if (existing.rows.length > 0) {
      optionsSkipped++
      continue
    }

    // Create option
    const id = `option_${Date.now()}_${Math.random().toString(36).substring(7)}`
    await client.execute({
      sql: `INSERT INTO Option (id, type, value, label, vehicleType, sortOrder, isActive, createdAt, updatedAt)
            VALUES (@id, @type, @value, @label, @vehicleType, 0, 1, datetime('now'), datetime('now'))`,
      args: {
        id,
        type: opt.type,
        value: opt.value,
        label: opt.label,
        vehicleType: opt.vehicleType,
      },
    })
    optionsCreated++
    console.log(`  Created: ${opt.type} - ${opt.label} (${opt.vehicleType})`)
  }

  console.log(`Options: ${optionsCreated} created, ${optionsSkipped} skipped (already exist)`)
  console.log('')

  // ============ STEP 4: Clean up duplicate options ============
  console.log('=== STEP 4: Clean up duplicate options ===')

  // Delete model/wheels options with NULL vehicleType (keep vehicle-specific)
  const deleteResult1 = await client.execute(
    'DELETE FROM Option WHERE type = "model" AND vehicleType IS NULL'
  )
  const deleteResult2 = await client.execute(
    'DELETE FROM Option WHERE type = "wheels" AND vehicleType IS NULL'
  )
  console.log(`Deleted ${deleteResult1.rowsAffected + deleteResult2.rowsAffected} duplicate options with NULL vehicleType`)

  // Fix range values if needed
  await client.execute(
    'UPDATE Option SET value = "maximale_reichweite" WHERE type = "range" AND value = "max_reichweite"'
  )
  console.log('')

  // ============ SUMMARY ============
  console.log('=== MIGRATION COMPLETE ===')

  const orderCount = await client.execute('SELECT COUNT(*) as count FROM "Order"')
  const vehicleTypeCount = await client.execute(
    'SELECT vehicleType, COUNT(*) as count FROM "Order" GROUP BY vehicleType'
  )

  console.log(`Total orders: ${orderCount.rows[0].count}`)
  console.log('Orders by vehicle type:')
  for (const row of vehicleTypeCount.rows) {
    console.log(`  ${row.vehicleType}: ${row.count}`)
  }
}

migrateProduction().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
