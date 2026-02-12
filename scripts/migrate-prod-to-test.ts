import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function migrate() {
  // Validate environment variables
  if (!process.env.TURSO_AUTH_TOKEN) {
    throw new Error('TURSO_AUTH_TOKEN required for production database')
  }
  if (!process.env.TURSO_DATABASE_URL_PREVIEW || !process.env.TURSO_AUTH_TOKEN_PREVIEW) {
    throw new Error('TURSO_DATABASE_URL_PREVIEW and TURSO_AUTH_TOKEN_PREVIEW required for test database')
  }

  // Connect to production (read)
  const prodClient = createClient({
    url: 'libsql://tesla-tracker-sven7687.aws-eu-west-1.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  // Connect to test (write)
  const testClient = createClient({
    url: process.env.TURSO_DATABASE_URL_PREVIEW,
    authToken: process.env.TURSO_AUTH_TOKEN_PREVIEW,
  })

  console.log('Connected to both databases')
  console.log('Production: tesla-tracker')
  console.log('Test: tff-order-stats-test')
  console.log('')

  // ============ MIGRATE ORDERS ============
  console.log('=== MIGRATING ORDERS ===')

  // Explicitly select columns from production (31 columns, no vehicleType)
  const orders = await prodClient.execute(`
    SELECT id, editCode, name, orderDate, country, model, range, drive, color,
           interior, wheels, towHitch, autopilot, deliveryWindow, deliveryLocation,
           vin, vinReceivedDate, papersReceivedDate, productionDate, typeApproval,
           typeVariant, deliveryDate, orderToProduction, orderToVin, orderToDelivery,
           orderToPapers, papersToDelivery, archived, archivedAt, createdAt, updatedAt
    FROM "Order"
  `)
  console.log(`Found ${orders.rows.length} orders in production`)

  // Clear existing test orders
  await testClient.execute('DELETE FROM "Order"')
  console.log('Cleared existing test orders')

  // Insert each order with vehicleType='Model Y'
  let ordersInserted = 0
  let ordersFailed = 0

  for (const order of orders.rows) {
    try {
      await testClient.execute({
        sql: `INSERT INTO "Order" (
          id, editCode, name, vehicleType, orderDate, country, model, range, drive,
          color, interior, wheels, towHitch, autopilot, deliveryWindow, deliveryLocation,
          vin, vinReceivedDate, papersReceivedDate, productionDate, typeApproval,
          typeVariant, deliveryDate, orderToProduction, orderToVin, orderToDelivery,
          orderToPapers, papersToDelivery, archived, archivedAt, createdAt, updatedAt
        ) VALUES (
          @id, @editCode, @name, 'Model Y', @orderDate, @country, @model, @range, @drive,
          @color, @interior, @wheels, @towHitch, @autopilot, @deliveryWindow, @deliveryLocation,
          @vin, @vinReceivedDate, @papersReceivedDate, @productionDate, @typeApproval,
          @typeVariant, @deliveryDate, @orderToProduction, @orderToVin, @orderToDelivery,
          @orderToPapers, @papersToDelivery, @archived, @archivedAt, @createdAt, @updatedAt
        )`,
        args: {
          id: order.id,
          editCode: order.editCode,
          name: order.name,
          orderDate: order.orderDate,
          country: order.country,
          model: order.model,
          range: order.range,
          drive: order.drive,
          color: order.color,
          interior: order.interior,
          wheels: order.wheels,
          towHitch: order.towHitch,
          autopilot: order.autopilot,
          deliveryWindow: order.deliveryWindow,
          deliveryLocation: order.deliveryLocation,
          vin: order.vin,
          vinReceivedDate: order.vinReceivedDate,
          papersReceivedDate: order.papersReceivedDate,
          productionDate: order.productionDate,
          typeApproval: order.typeApproval,
          typeVariant: order.typeVariant,
          deliveryDate: order.deliveryDate,
          orderToProduction: order.orderToProduction,
          orderToVin: order.orderToVin,
          orderToDelivery: order.orderToDelivery,
          orderToPapers: order.orderToPapers,
          papersToDelivery: order.papersToDelivery,
          archived: order.archived ? 1 : 0,
          archivedAt: order.archivedAt,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
      })
      ordersInserted++
      if (ordersInserted % 50 === 0) {
        console.log(`  Progress: ${ordersInserted}/${orders.rows.length} orders`)
      }
    } catch (err) {
      ordersFailed++
      console.error(`  Failed to insert order ${order.id} (${order.name}):`, err)
    }
  }

  console.log(`Orders: ${ordersInserted} inserted, ${ordersFailed} failed`)
  console.log('')

  // ============ MIGRATE OPTIONS ============
  console.log('=== MIGRATING OPTIONS ===')

  const prodOptions = await prodClient.execute('SELECT * FROM Option')
  console.log(`Found ${prodOptions.rows.length} options in production`)

  const testOptions = await testClient.execute('SELECT type, value, vehicleType FROM Option')
  const testSet = new Set(
    testOptions.rows.map(o => `${o.type}:${o.value}:${o.vehicleType || 'null'}`)
  )
  console.log(`Found ${testOptions.rows.length} options in test`)

  let optionsInserted = 0
  let optionsSkipped = 0

  for (const opt of prodOptions.rows) {
    // Check if option exists in test (with null vehicleType for global options)
    const key = `${opt.type}:${opt.value}:null`
    if (testSet.has(key)) {
      optionsSkipped++
      continue
    }

    try {
      await testClient.execute({
        sql: `INSERT INTO Option (id, type, value, label, metadata, sortOrder, isActive, vehicleType, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, NULL, datetime('now'), datetime('now'))`,
        args: [
          opt.id,
          opt.type,
          opt.value,
          opt.label,
          opt.metadata,
          opt.sortOrder,
          opt.isActive,
        ],
      })
      optionsInserted++
      console.log(`  Added: ${opt.type} - ${opt.label}`)
    } catch (err) {
      console.error(`  Failed: ${opt.type} ${opt.value}:`, err)
    }
  }

  console.log(`Options: ${optionsInserted} added, ${optionsSkipped} skipped (already exist)`)
  console.log('')

  // ============ SUMMARY ============
  console.log('=== MIGRATION COMPLETE ===')
  console.log(`Orders migrated: ${ordersInserted}/${orders.rows.length}`)
  console.log(`Options added: ${optionsInserted}`)
  console.log('')
  console.log('All orders set to vehicleType="Model Y"')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
