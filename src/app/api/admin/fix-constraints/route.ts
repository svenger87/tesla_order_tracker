import { query, execute, nowISO } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

const VALUE_FIXES: Record<string, string> = {
  'max': 'maximale_reichweite',
  'max_reichweite': 'maximale_reichweite',
}

const SOURCE_VALUE_FIXES: Record<string, string> = {
  'performance_m3': 'performance',
}

export async function POST(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  try {
    const results = []

    const constraints = await query<{ id: string; sourceValue: string; targetType: string; values: string }>(
      `SELECT id, sourceValue, targetType, values FROM "OptionConstraint"`,
    )

    for (const constraint of constraints) {
      let values: string | string[] = JSON.parse(constraint.values)
      let sourceValue = constraint.sourceValue
      let needsUpdate = false
      const changes: string[] = []

      if (SOURCE_VALUE_FIXES[sourceValue]) {
        changes.push(`sourceValue: ${sourceValue} -> ${SOURCE_VALUE_FIXES[sourceValue]}`)
        sourceValue = SOURCE_VALUE_FIXES[sourceValue]
        needsUpdate = true
      }

      if (typeof values === 'string') {
        if (VALUE_FIXES[values]) {
          changes.push(`values: ${values} -> ${VALUE_FIXES[values]}`)
          values = VALUE_FIXES[values]
          needsUpdate = true
        }
      } else if (Array.isArray(values)) {
        const newValues = values.map(v => VALUE_FIXES[v] || v)
        if (JSON.stringify(newValues) !== JSON.stringify(values)) {
          changes.push(`values: ${JSON.stringify(values)} -> ${JSON.stringify(newValues)}`)
          values = newValues
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        await execute(
          `UPDATE "OptionConstraint" SET sourceValue = ?, values = ?, updatedAt = ? WHERE id = ?`,
          [sourceValue, JSON.stringify(values), nowISO(), constraint.id],
        )
        results.push({
          id: constraint.id,
          originalSourceValue: constraint.sourceValue,
          targetType: constraint.targetType,
          changes,
        })
      }
    }

    return NextResponse.json({ success: true, fixed: results.length, details: results })
  } catch (error) {
    console.error('Failed to fix constraints:', error)
    return NextResponse.json({ error: 'Failed to fix constraints' }, { status: 500 })
  }
}
