import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

// Valid constraint types
const VALID_CONSTRAINT_TYPES = ['allow', 'fixed', 'disable'] as const
type ConstraintType = typeof VALID_CONSTRAINT_TYPES[number]

// Valid source/target types
const VALID_OPTION_TYPES = ['model', 'range', 'drive', 'color', 'interior', 'wheels', 'autopilot', 'towHitch'] as const

// Valid vehicle types
const VALID_VEHICLE_TYPES = ['Model Y', 'Model 3'] as const

function isValidConstraintType(type: string): type is ConstraintType {
  return VALID_CONSTRAINT_TYPES.includes(type as ConstraintType)
}

// GET - List all constraints (public, for form logic)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sourceType = searchParams.get('sourceType')
    const sourceValue = searchParams.get('sourceValue')
    const vehicleType = searchParams.get('vehicleType')

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (sourceType) where.sourceType = sourceType
    if (sourceValue) where.sourceValue = sourceValue

    // If vehicleType specified, include constraints for that vehicle OR global (null)
    if (vehicleType) {
      where.OR = [
        { vehicleType: null },
        { vehicleType: vehicleType },
      ]
    }

    const constraints = await prisma.optionConstraint.findMany({
      where,
      orderBy: [{ sourceType: 'asc' }, { sourceValue: 'asc' }, { targetType: 'asc' }],
    })

    // Parse JSON values
    const parsed = constraints.map(c => ({
      ...c,
      values: JSON.parse(c.values),
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Failed to fetch constraints:', error)
    return NextResponse.json({ error: 'Failed to fetch constraints' }, { status: 500 })
  }
}

// POST - Create new constraint (admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { sourceType, sourceValue, vehicleType, targetType, constraintType, values } = body

    // Validation
    if (!sourceType || !sourceValue || !targetType || !constraintType || values === undefined) {
      return NextResponse.json({
        error: 'sourceType, sourceValue, targetType, constraintType, and values are required'
      }, { status: 400 })
    }

    if (!VALID_OPTION_TYPES.includes(sourceType)) {
      return NextResponse.json({
        error: `Invalid sourceType. Must be one of: ${VALID_OPTION_TYPES.join(', ')}`
      }, { status: 400 })
    }

    if (!VALID_OPTION_TYPES.includes(targetType)) {
      return NextResponse.json({
        error: `Invalid targetType. Must be one of: ${VALID_OPTION_TYPES.join(', ')}`
      }, { status: 400 })
    }

    if (!isValidConstraintType(constraintType)) {
      return NextResponse.json({
        error: `Invalid constraintType. Must be one of: ${VALID_CONSTRAINT_TYPES.join(', ')}`
      }, { status: 400 })
    }

    if (vehicleType && !VALID_VEHICLE_TYPES.includes(vehicleType)) {
      return NextResponse.json({
        error: `Invalid vehicleType. Must be one of: ${VALID_VEHICLE_TYPES.join(', ')}`
      }, { status: 400 })
    }

    // Validate values based on constraint type
    if (constraintType === 'allow' && !Array.isArray(values)) {
      return NextResponse.json({
        error: 'For "allow" constraint, values must be an array'
      }, { status: 400 })
    }

    if (constraintType === 'fixed' && typeof values !== 'string') {
      return NextResponse.json({
        error: 'For "fixed" constraint, values must be a string'
      }, { status: 400 })
    }

    const constraint = await prisma.optionConstraint.create({
      data: {
        sourceType,
        sourceValue,
        vehicleType: vehicleType || null,
        targetType,
        constraintType,
        values: JSON.stringify(values),
      },
    })

    return NextResponse.json({
      ...constraint,
      values: JSON.parse(constraint.values),
    })
  } catch (error) {
    console.error('Failed to create constraint:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    if (errorMsg.includes('Unique constraint')) {
      return NextResponse.json({
        error: 'Eine Constraint für diese Kombination existiert bereits'
      }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create constraint' }, { status: 500 })
  }
}

// PUT - Update constraint (admin only)
export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { id, constraintType, values, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    if (constraintType && !isValidConstraintType(constraintType)) {
      return NextResponse.json({
        error: `Invalid constraintType. Must be one of: ${VALID_CONSTRAINT_TYPES.join(', ')}`
      }, { status: 400 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (constraintType !== undefined) updateData.constraintType = constraintType
    if (values !== undefined) updateData.values = JSON.stringify(values)
    if (isActive !== undefined) updateData.isActive = isActive

    const constraint = await prisma.optionConstraint.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      ...constraint,
      values: JSON.parse(constraint.values),
    })
  } catch (error) {
    console.error('Failed to update constraint:', error)
    return NextResponse.json({ error: 'Failed to update constraint' }, { status: 500 })
  }
}

// DELETE - Delete constraint (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await prisma.optionConstraint.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Constraint deleted' })
  } catch (error) {
    console.error('Failed to delete constraint:', error)
    return NextResponse.json({ error: 'Failed to delete constraint' }, { status: 500 })
  }
}
