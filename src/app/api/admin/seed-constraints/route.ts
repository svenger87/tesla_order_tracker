import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { validateApiKey } from '@/lib/api-auth'
import { VehicleType } from '@/lib/types'
import {
  ALL_CONSTRAINTS,
  MODEL_3_CONSTRAINTS,
  MODEL_Y_CONSTRAINTS,
  MODEL_S_CONSTRAINTS,
  MODEL_X_CONSTRAINTS,
  CYBERTRUCK_CONSTRAINTS,
  ROADSTER_CONSTRAINTS,
  DRIVE_CONSTRAINTS,
} from '@/lib/vehicle-constraints'

// POST - Seed constraints from hardcoded rules (admin or API key auth)
export async function POST(request: NextRequest) {
  // Try admin cookie auth first
  const admin = await getAdminFromCookie()

  if (!admin) {
    // Fall back to API key auth
    const { valid } = validateApiKey(request)
    if (!valid) {
      return NextResponse.json({ error: 'Admin access or API key required' }, { status: 401 })
    }
  }

  try {
    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get('dryRun') === 'true'
    const vehicleType = searchParams.get('vehicleType') as VehicleType | null

    // Filter constraints if vehicleType specified
    let constraintsToSeed = ALL_CONSTRAINTS
    if (vehicleType) {
      constraintsToSeed = ALL_CONSTRAINTS.filter(c => c.vehicleType === vehicleType)
    }

    const results = {
      total: constraintsToSeed.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as { constraint: string; action: string }[],
    }

    for (const constraint of constraintsToSeed) {
      const constraintKey = `${constraint.vehicleType}:${constraint.sourceValue}:${constraint.targetType}`

      // Check if constraint already exists
      const existing = await prisma.optionConstraint.findFirst({
        where: {
          sourceType: constraint.sourceType,
          sourceValue: constraint.sourceValue,
          vehicleType: constraint.vehicleType,
          targetType: constraint.targetType,
        },
      })

      if (existing) {
        const serializedValues = JSON.stringify(constraint.values)
        const valuesChanged = existing.values !== serializedValues
        const typeChanged = existing.constraintType !== constraint.constraintType
        const activeChanged = existing.isActive !== true

        if (!valuesChanged && !typeChanged && !activeChanged) {
          results.skipped++
          results.details.push({ constraint: constraintKey, action: 'skipped (unchanged)' })
          continue
        }

        if (dryRun) {
          results.updated++
          results.details.push({ constraint: constraintKey, action: 'would update' })
          continue
        }

        await prisma.optionConstraint.update({
          where: { id: existing.id },
          data: {
            constraintType: constraint.constraintType,
            values: serializedValues,
            isActive: true,
          },
        })
        results.updated++
        results.details.push({ constraint: constraintKey, action: 'updated' })
        continue
      }

      if (dryRun) {
        results.created++
        results.details.push({ constraint: constraintKey, action: 'would create' })
        continue
      }

      try {
        await prisma.optionConstraint.create({
          data: {
            sourceType: constraint.sourceType,
            sourceValue: constraint.sourceValue,
            vehicleType: constraint.vehicleType,
            targetType: constraint.targetType,
            constraintType: constraint.constraintType,
            values: JSON.stringify(constraint.values),
            isActive: true,
          },
        })
        results.created++
        results.details.push({ constraint: constraintKey, action: 'created' })
      } catch (err) {
        results.errors.push(`${constraintKey}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      ...results,
    })
  } catch (error) {
    console.error('Failed to seed constraints:', error)
    return NextResponse.json({ error: 'Failed to seed constraints' }, { status: 500 })
  }
}

// GET - List available constraints to seed
export async function GET(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) {
    const { valid } = validateApiKey(request)
    if (!valid) {
      return NextResponse.json({ error: 'Admin access or API key required' }, { status: 401 })
    }
  }

  return NextResponse.json({
    available: ALL_CONSTRAINTS.map(c => ({
      key: `${c.vehicleType}:${c.sourceValue}:${c.targetType}`,
      ...c,
    })),
    modelYCount: MODEL_Y_CONSTRAINTS.length,
    model3Count: MODEL_3_CONSTRAINTS.length,
    modelSCount: MODEL_S_CONSTRAINTS.length,
    modelXCount: MODEL_X_CONSTRAINTS.length,
    cybertruckCount: CYBERTRUCK_CONSTRAINTS.length,
    roadsterCount: ROADSTER_CONSTRAINTS.length,
    driveCount: DRIVE_CONSTRAINTS.length,
    totalCount: ALL_CONSTRAINTS.length,
  })
}
