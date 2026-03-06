'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { VehicleType } from '@/lib/types'

export type ConstraintType = 'allow' | 'fixed' | 'disable'

export interface Constraint {
  id: string
  sourceType: string
  sourceValue: string
  vehicleType: string | null
  targetType: string
  constraintType: ConstraintType
  values: string[] | string // array for 'allow', string for 'fixed'
  isActive: boolean
}

export interface FieldConstraint {
  type: ConstraintType
  allowedValues?: string[] // For 'allow' type
  fixedValue?: string // For 'fixed' type
}

export interface ConstraintsForModel {
  wheels?: FieldConstraint
  color?: FieldConstraint
  interior?: FieldConstraint
  range?: FieldConstraint
  drive?: FieldConstraint
  towHitch?: FieldConstraint
  autopilot?: FieldConstraint
  seats?: FieldConstraint
}

function buildFieldConstraint(constraint: Constraint): FieldConstraint {
  const fieldConstraint: FieldConstraint = {
    type: constraint.constraintType,
  }
  if (constraint.constraintType === 'allow') {
    fieldConstraint.allowedValues = constraint.values as string[]
  } else if (constraint.constraintType === 'fixed') {
    fieldConstraint.fixedValue = constraint.values as string
  }
  return fieldConstraint
}

const TARGET_KEYS: (keyof ConstraintsForModel)[] = ['wheels', 'color', 'interior', 'range', 'drive', 'towHitch', 'autopilot', 'seats']

function constraintsToMap(filtered: Constraint[]): ConstraintsForModel {
  const result: ConstraintsForModel = {}
  for (const constraint of filtered) {
    if (TARGET_KEYS.includes(constraint.targetType as keyof ConstraintsForModel)) {
      result[constraint.targetType as keyof ConstraintsForModel] = buildFieldConstraint(constraint)
    }
  }
  return result
}

export function useConstraints(vehicleType?: VehicleType) {
  const [constraints, setConstraints] = useState<Constraint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConstraints() {
      try {
        // Fetch all constraints (both model and drive based)
        const params = new URLSearchParams()
        if (vehicleType) {
          params.set('vehicleType', vehicleType)
        }

        const res = await fetch(`/api/constraints?${params}`)
        if (res.ok) {
          const data = await res.json()
          setConstraints(data)
        } else {
          setError('Failed to load constraints')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchConstraints()
  }, [vehicleType])

  // Get constraints for a specific model/trim (model-based only)
  const getConstraintsForModel = useCallback((modelValue: string): ConstraintsForModel => {
    const modelConstraints = constraints.filter(c =>
      c.sourceType === 'model' &&
      c.sourceValue === modelValue &&
      c.isActive
    )
    return constraintsToMap(modelConstraints)
  }, [constraints])

  // Get constraints for a specific drive value (drive-based only)
  const getConstraintsForDrive = useCallback((driveValue: string): ConstraintsForModel => {
    const driveConstraints = constraints.filter(c =>
      c.sourceType === 'drive' &&
      c.sourceValue === driveValue &&
      c.isActive
    )
    return constraintsToMap(driveConstraints)
  }, [constraints])

  // Merge model + drive constraints; drive overrides model for same target field
  const getMergedConstraints = useCallback((modelValue: string, driveValue: string): ConstraintsForModel => {
    const modelResult = getConstraintsForModel(modelValue)
    if (!driveValue) return modelResult

    const driveResult = getConstraintsForDrive(driveValue)

    // Drive constraints override model constraints for same field
    return { ...modelResult, ...driveResult }
  }, [getConstraintsForModel, getConstraintsForDrive])

  // Helper to check if a value is allowed for a field given the model constraints
  const isValueAllowed = useCallback((
    modelValue: string,
    fieldType: keyof ConstraintsForModel,
    value: string
  ): boolean => {
    const modelConstraints = getConstraintsForModel(modelValue)
    const fieldConstraint = modelConstraints[fieldType]

    if (!fieldConstraint) return true // No constraint = all allowed

    if (fieldConstraint.type === 'disable') return false
    if (fieldConstraint.type === 'fixed') return value === fieldConstraint.fixedValue
    if (fieldConstraint.type === 'allow') {
      return fieldConstraint.allowedValues?.includes(value) ?? true
    }

    return true
  }, [getConstraintsForModel])

  // Helper to get the fixed value for a field (if any)
  const getFixedValue = useCallback((
    modelValue: string,
    fieldType: keyof ConstraintsForModel
  ): string | undefined => {
    const modelConstraints = getConstraintsForModel(modelValue)
    const fieldConstraint = modelConstraints[fieldType]

    if (fieldConstraint?.type === 'fixed') {
      return fieldConstraint.fixedValue
    }

    return undefined
  }, [getConstraintsForModel])

  // Helper to check if a field is disabled for a model
  const isFieldDisabled = useCallback((
    modelValue: string,
    fieldType: keyof ConstraintsForModel
  ): boolean => {
    const modelConstraints = getConstraintsForModel(modelValue)
    const fieldConstraint = modelConstraints[fieldType]

    return fieldConstraint?.type === 'disable' || fieldConstraint?.type === 'fixed'
  }, [getConstraintsForModel])

  // Helper to filter options based on constraints
  const filterOptions = useCallback(<T extends { value: string }>(
    modelValue: string,
    fieldType: keyof ConstraintsForModel,
    options: T[]
  ): T[] => {
    const modelConstraints = getConstraintsForModel(modelValue)
    const fieldConstraint = modelConstraints[fieldType]

    if (!fieldConstraint || fieldConstraint.type === 'disable') {
      return fieldConstraint?.type === 'disable' ? [] : options
    }

    if (fieldConstraint.type === 'fixed') {
      return options.filter(o => o.value === fieldConstraint.fixedValue)
    }

    if (fieldConstraint.type === 'allow' && fieldConstraint.allowedValues) {
      return options.filter(o => fieldConstraint.allowedValues!.includes(o.value))
    }

    return options
  }, [getConstraintsForModel])

  // Get all unique model values that have constraints
  const modelsWithConstraints = useMemo(() => {
    const models = new Set<string>()
    for (const c of constraints) {
      if (c.sourceType === 'model') {
        models.add(c.sourceValue)
      }
    }
    return Array.from(models)
  }, [constraints])

  return {
    constraints,
    loading,
    error,
    getConstraintsForModel,
    getConstraintsForDrive,
    getMergedConstraints,
    isValueAllowed,
    getFixedValue,
    isFieldDisabled,
    filterOptions,
    modelsWithConstraints,
  }
}
