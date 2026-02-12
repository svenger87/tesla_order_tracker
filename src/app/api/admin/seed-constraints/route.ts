import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { validateApiKey } from '@/lib/api-auth'

interface ConstraintDefinition {
  sourceType: 'model'
  sourceValue: string
  vehicleType: 'Model Y' | 'Model 3'
  targetType: 'wheels' | 'color' | 'interior' | 'range' | 'drive' | 'towHitch'
  constraintType: 'allow' | 'fixed' | 'disable'
  values: string[] | string
}

// All Model 3 constraints based on German market 2025
// NOTE: Values must match exactly with types.ts (RANGES, DRIVES, INTERIORS, WHEELS)
const MODEL_3_CONSTRAINTS: ConstraintDefinition[] = [
  // Hinterradantrieb
  { sourceType: 'model', sourceValue: 'hinterradantrieb', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'fixed', values: '18' },
  { sourceType: 'model', sourceValue: 'hinterradantrieb', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: 'standard' },
  { sourceType: 'model', sourceValue: 'hinterradantrieb', vehicleType: 'Model 3', targetType: 'drive', constraintType: 'fixed', values: 'rwd' },
  { sourceType: 'model', sourceValue: 'hinterradantrieb', vehicleType: 'Model 3', targetType: 'interior', constraintType: 'fixed', values: 'black' },
  { sourceType: 'model', sourceValue: 'hinterradantrieb', vehicleType: 'Model 3', targetType: 'color', constraintType: 'allow', values: ['pearl_white', 'diamond_black', 'stealth_grey'] },
  // towHitch is available for Hinterradantrieb, so no constraint needed

  // Premium Maximale Reichweite RWD
  { sourceType: 'model', sourceValue: 'premium_lr_rwd', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'allow', values: ['18', '19'] },
  { sourceType: 'model', sourceValue: 'premium_lr_rwd', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'premium_lr_rwd', vehicleType: 'Model 3', targetType: 'drive', constraintType: 'fixed', values: 'rwd' },
  { sourceType: 'model', sourceValue: 'premium_lr_rwd', vehicleType: 'Model 3', targetType: 'towHitch', constraintType: 'disable', values: [] },

  // Premium Maximale Reichweite AWD
  { sourceType: 'model', sourceValue: 'premium_lr_awd', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'allow', values: ['18', '19'] },
  { sourceType: 'model', sourceValue: 'premium_lr_awd', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'premium_lr_awd', vehicleType: 'Model 3', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'premium_lr_awd', vehicleType: 'Model 3', targetType: 'towHitch', constraintType: 'disable', values: [] },

  // Performance
  { sourceType: 'model', sourceValue: 'performance_m3', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'fixed', values: '20' },
  { sourceType: 'model', sourceValue: 'performance_m3', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'performance_m3', vehicleType: 'Model 3', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'performance_m3', vehicleType: 'Model 3', targetType: 'towHitch', constraintType: 'disable', values: [] },
]

// All Model Y constraints
// NOTE: Values must match exactly with types.ts (RANGES, DRIVES, INTERIORS, WHEELS)
const MODEL_Y_CONSTRAINTS: ConstraintDefinition[] = [
  // Standard
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'range', constraintType: 'fixed', values: 'standard' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'wheels', constraintType: 'fixed', values: '18' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'drive', constraintType: 'fixed', values: 'rwd' },

  // Performance
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'wheels', constraintType: 'fixed', values: '21' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'drive', constraintType: 'fixed', values: 'awd' },

  // Premium - wheels constrained but user can choose
  { sourceType: 'model', sourceValue: 'premium', vehicleType: 'Model Y', targetType: 'wheels', constraintType: 'allow', values: ['19', '20'] },
  // Note: Premium range is typically Max but was editable in Q3, so no constraint for now
]

const ALL_CONSTRAINTS = [...MODEL_3_CONSTRAINTS, ...MODEL_Y_CONSTRAINTS]

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
    const vehicleType = searchParams.get('vehicleType') as 'Model Y' | 'Model 3' | null

    // Filter constraints if vehicleType specified
    let constraintsToSeed = ALL_CONSTRAINTS
    if (vehicleType) {
      constraintsToSeed = ALL_CONSTRAINTS.filter(c => c.vehicleType === vehicleType)
    }

    const results = {
      total: constraintsToSeed.length,
      created: 0,
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
        results.skipped++
        results.details.push({ constraint: constraintKey, action: 'skipped (exists)' })
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
    totalCount: ALL_CONSTRAINTS.length,
  })
}
