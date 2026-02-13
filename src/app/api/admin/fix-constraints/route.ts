import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

// Value mappings to fix - old value -> correct value
const VALUE_FIXES: Record<string, string> = {
  'max': 'maximale_reichweite',
  'max_reichweite': 'maximale_reichweite',
}

// Source value mappings to fix - old sourceValue -> correct sourceValue
const SOURCE_VALUE_FIXES: Record<string, string> = {
  'performance_m3': 'performance',
}

// POST - Fix constraint values in database
export async function POST(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  try {
    const results = []

    // Get all constraints
    const constraints = await prisma.optionConstraint.findMany()

    for (const constraint of constraints) {
      let values = JSON.parse(constraint.values)
      let sourceValue = constraint.sourceValue
      let needsUpdate = false
      const changes: string[] = []

      // Check if sourceValue needs fixing
      if (SOURCE_VALUE_FIXES[sourceValue]) {
        changes.push(`sourceValue: ${sourceValue} -> ${SOURCE_VALUE_FIXES[sourceValue]}`)
        sourceValue = SOURCE_VALUE_FIXES[sourceValue]
        needsUpdate = true
      }

      // Check if it's a string (fixed value)
      if (typeof values === 'string') {
        if (VALUE_FIXES[values]) {
          changes.push(`values: ${values} -> ${VALUE_FIXES[values]}`)
          values = VALUE_FIXES[values]
          needsUpdate = true
        }
      }
      // Check if it's an array (allowed values)
      else if (Array.isArray(values)) {
        const newValues = values.map(v => VALUE_FIXES[v] || v)
        if (JSON.stringify(newValues) !== JSON.stringify(values)) {
          changes.push(`values: ${JSON.stringify(values)} -> ${JSON.stringify(newValues)}`)
          values = newValues
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        await prisma.optionConstraint.update({
          where: { id: constraint.id },
          data: {
            sourceValue,
            values: JSON.stringify(values),
          },
        })
        results.push({
          id: constraint.id,
          originalSourceValue: constraint.sourceValue,
          targetType: constraint.targetType,
          changes,
        })
      }
    }

    return NextResponse.json({
      success: true,
      fixed: results.length,
      details: results,
    })
  } catch (error) {
    console.error('Failed to fix constraints:', error)
    return NextResponse.json({ error: 'Failed to fix constraints' }, { status: 500 })
  }
}
