import { queryOne, execute, generateId, nowISO } from '@/lib/db'
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

const MODEL_3_CONSTRAINTS: ConstraintDefinition[] = [
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'fixed', values: '18' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: 'standard' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model 3', targetType: 'drive', constraintType: 'fixed', values: 'rwd' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model 3', targetType: 'interior', constraintType: 'fixed', values: 'black' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model 3', targetType: 'color', constraintType: 'allow', values: ['pearl_white', 'diamond_black', 'stealth_grey'] },
  { sourceType: 'model', sourceValue: 'premium', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'allow', values: ['18', '19'] },
  { sourceType: 'model', sourceValue: 'premium', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'premium', vehicleType: 'Model 3', targetType: 'towHitch', constraintType: 'disable', values: [] },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'fixed', values: '20' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'towHitch', constraintType: 'disable', values: [] },
]

const MODEL_Y_CONSTRAINTS: ConstraintDefinition[] = [
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'range', constraintType: 'fixed', values: 'standard' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'wheels', constraintType: 'fixed', values: '18' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'drive', constraintType: 'fixed', values: 'rwd' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'wheels', constraintType: 'fixed', values: '21' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'premium', vehicleType: 'Model Y', targetType: 'wheels', constraintType: 'allow', values: ['19', '20'] },
]

const ALL_CONSTRAINTS = [...MODEL_3_CONSTRAINTS, ...MODEL_Y_CONSTRAINTS]

export async function POST(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) {
    const { valid } = validateApiKey(request)
    if (!valid) {
      return NextResponse.json({ error: 'Admin access or API key required' }, { status: 401 })
    }
  }

  try {
    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get('dryRun') === 'true'
    const vehicleType = searchParams.get('vehicleType') as 'Model Y' | 'Model 3' | null

    let constraintsToSeed = ALL_CONSTRAINTS
    if (vehicleType) {
      constraintsToSeed = ALL_CONSTRAINTS.filter(c => c.vehicleType === vehicleType)
    }

    const results = {
      total: constraintsToSeed.length, created: 0, skipped: 0,
      errors: [] as string[], details: [] as { constraint: string; action: string }[],
    }

    for (const constraint of constraintsToSeed) {
      const constraintKey = `${constraint.vehicleType}:${constraint.sourceValue}:${constraint.targetType}`

      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM "OptionConstraint" WHERE sourceType = ? AND sourceValue = ? AND vehicleType = ? AND targetType = ? LIMIT 1`,
        [constraint.sourceType, constraint.sourceValue, constraint.vehicleType, constraint.targetType],
      )

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
        const now = nowISO()
        await execute(
          `INSERT INTO "OptionConstraint" (id, sourceType, sourceValue, vehicleType, targetType, constraintType, values, isActive, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [generateId(), constraint.sourceType, constraint.sourceValue, constraint.vehicleType, constraint.targetType, constraint.constraintType, JSON.stringify(constraint.values), now, now],
        )
        results.created++
        results.details.push({ constraint: constraintKey, action: 'created' })
      } catch (err) {
        results.errors.push(`${constraintKey}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({ success: true, dryRun, ...results })
  } catch (error) {
    console.error('Failed to seed constraints:', error)
    return NextResponse.json({ error: 'Failed to seed constraints' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) {
    const { valid } = validateApiKey(request)
    if (!valid) {
      return NextResponse.json({ error: 'Admin access or API key required' }, { status: 401 })
    }
  }

  return NextResponse.json({
    available: ALL_CONSTRAINTS.map(c => ({ key: `${c.vehicleType}:${c.sourceValue}:${c.targetType}`, ...c })),
    modelYCount: MODEL_Y_CONSTRAINTS.length,
    model3Count: MODEL_3_CONSTRAINTS.length,
    totalCount: ALL_CONSTRAINTS.length,
  })
}
