import { createClient } from '@libsql/client'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import * as fs from 'fs'

// Manually parse .env and .env.local to handle quoted values
for (const envFile of ['.env', '.env.local']) {
  if (!fs.existsSync(envFile)) continue
  const envContent = fs.readFileSync(envFile, 'utf-8')
  const envLines = envContent.split('\n')
  for (const line of envLines) {
    const match = line.match(/^([^=#]+)="?([^"]+)"?\s*$/)
    if (match) {
      process.env[match[1].trim()] = match[2]
    }
  }
}

console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL)

const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Local SQLite adapter
const localAdapter = new PrismaLibSql({
  url: 'file:./prisma/dev.db',
})
const localPrisma = new PrismaClient({ adapter: localAdapter })

// Helper: convert null to undefined for optional Prisma fields
function nu(val: unknown): string | undefined {
  return val == null ? undefined : String(val)
}

async function syncTursoToLocal() {
  console.log('Fetching orders from Turso...')

  const result = await tursoClient.execute('SELECT * FROM "Order"')
  console.log(`Found ${result.rows.length} orders in Turso`)

  // Clear local database
  console.log('Clearing local database...')
  await localPrisma.order.deleteMany({})

  // Insert all orders
  console.log('Inserting orders into local database...')
  let inserted = 0

  for (const row of result.rows) {
    await localPrisma.order.create({
      data: {
        id: row.id as string,
        editCode: row.editCode as string | null,
        name: row.name as string,
        vehicleType: nu(row.vehicleType),
        orderDate: row.orderDate as string | null,
        country: row.country as string | null,
        model: row.model as string | null,
        range: row.range as string | null,
        drive: row.drive as string | null,
        color: row.color as string | null,
        interior: row.interior as string | null,
        wheels: row.wheels as string | null,
        towHitch: row.towHitch as string | null,
        autopilot: row.autopilot as string | null,
        deliveryWindow: row.deliveryWindow as string | null,
        deliveryLocation: row.deliveryLocation as string | null,
        vin: row.vin as string | null,
        vinReceivedDate: row.vinReceivedDate as string | null,
        papersReceivedDate: row.papersReceivedDate as string | null,
        productionDate: row.productionDate as string | null,
        typeApproval: row.typeApproval as string | null,
        typeVariant: row.typeVariant as string | null,
        deliveryDate: row.deliveryDate as string | null,
        orderToProduction: row.orderToProduction as number | null,
        orderToVin: row.orderToVin as number | null,
        orderToDelivery: row.orderToDelivery as number | null,
        orderToPapers: row.orderToPapers as number | null,
        papersToDelivery: row.papersToDelivery as number | null,
        archived: row.archived === 1 || (row.archived as unknown) === true,
        archivedAt: row.archivedAt ? new Date(row.archivedAt as string) : null,
        createdAt: row.createdAt ? new Date(row.createdAt as string) : new Date(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt as string) : new Date(),
        resetCode: row.resetCode as string | null,
        resetCodeExpires: row.resetCodeExpires ? new Date(row.resetCodeExpires as string) : null,
      },
    })
    inserted++
    if (inserted % 50 === 0) {
      console.log(`  Inserted ${inserted}/${result.rows.length}...`)
    }
  }

  console.log(`Done! Synced ${inserted} orders from Turso to local.`)

  // Sync Admin table
  console.log('Syncing Admin table...')
  const admins = await tursoClient.execute('SELECT * FROM "Admin"')
  await localPrisma.admin.deleteMany({})

  for (const row of admins.rows) {
    await localPrisma.admin.create({
      data: {
        id: row.id as string,
        username: row.username as string,
        passwordHash: row.passwordHash as string,
        createdAt: row.createdAt ? new Date(row.createdAt as string) : new Date(),
      },
    })
  }
  console.log(`Synced ${admins.rows.length} admins.`)

  // Sync Option table
  console.log('Syncing Option table...')
  const options = await tursoClient.execute('SELECT * FROM "Option"')
  await localPrisma.option.deleteMany({})

  for (const row of options.rows) {
    await localPrisma.option.create({
      data: {
        id: row.id as string,
        type: row.type as string,
        value: row.value as string,
        label: row.label as string,
        vehicleType: row.vehicleType as string | null,
        metadata: row.metadata as string | null,
        sortOrder: (row.sortOrder as number) ?? 0,
        isActive: row.isActive === 1 || (row.isActive as unknown) === true,
        createdAt: row.createdAt ? new Date(row.createdAt as string) : new Date(),
      },
    })
  }
  console.log(`Synced ${options.rows.length} options.`)

  // Sync Constraint table (may not exist in production)
  try {
    console.log('Syncing Constraint table...')
    const constraints = await tursoClient.execute('SELECT * FROM "Constraint"')
    await localPrisma.constraint.deleteMany({})

    for (const row of constraints.rows) {
      await localPrisma.constraint.create({
        data: {
          id: row.id as string,
          sourceType: row.sourceType as string,
          sourceValue: row.sourceValue as string,
          vehicleType: row.vehicleType as string | null,
          targetType: row.targetType as string,
          constraintType: row.constraintType as string,
          values: row.values as string,
          isActive: row.isActive === 1 || (row.isActive as unknown) === true,
          createdAt: row.createdAt ? new Date(row.createdAt as string) : new Date(),
        },
      })
    }
    console.log(`Synced ${constraints.rows.length} constraints.`)
  } catch (e) {
    console.log('Constraint table not found in Turso, skipping (keeping local constraints).')
  }

  // Sync Settings table (may not exist in production)
  try {
    console.log('Syncing Settings table...')
    const settings = await tursoClient.execute('SELECT * FROM "Settings"')
    await localPrisma.settings.deleteMany({})

    for (const row of settings.rows) {
      await localPrisma.settings.create({
        data: {
          id: row.id as string,
          showDonation: row.showDonation === 1 || (row.showDonation as unknown) === true,
          donationUrl: (row.donationUrl as string) ?? '',
          donationText: (row.donationText as string) ?? '',
          lastSyncTime: row.lastSyncTime ? new Date(row.lastSyncTime as string) : null,
          lastSyncCount: row.lastSyncCount as number | null,
          archiveEnabled: row.archiveEnabled === 1 || (row.archiveEnabled as unknown) === true,
          archiveThreshold: (row.archiveThreshold as number) ?? 30,
        },
      })
    }
    console.log(`Synced ${settings.rows.length} settings.`)
  } catch (e) {
    console.log('Settings table not found in Turso, skipping (keeping local settings).')
  }

  await localPrisma.$disconnect()
  tursoClient.close()
}

syncTursoToLocal().catch(console.error)
