import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

// Value mappings to fix - old value -> correct value
const VALUE_FIXES: Record<string, string> = {
  'max': 'maximale_reichweite',
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
      let needsUpdate = false

      // Check if it's a string (fixed value)
      if (typeof values === 'string') {
        if (VALUE_FIXES[values]) {
          values = VALUE_FIXES[values]
          needsUpdate = true
        }
      }
      // Check if it's an array (allowed values)
      else if (Array.isArray(values)) {
        const newValues = values.map(v => VALUE_FIXES[v] || v)
        if (JSON.stringify(newValues) !== JSON.stringify(values)) {
          values = newValues
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        await prisma.optionConstraint.update({
          where: { id: constraint.id },
          data: { values: JSON.stringify(values) },
        })
        results.push({
          id: constraint.id,
          sourceValue: constraint.sourceValue,
          targetType: constraint.targetType,
          oldValue: JSON.parse(constraint.values),
          newValue: values,
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
