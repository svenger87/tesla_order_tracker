import { VehicleType } from './types'

export interface ConstraintDefinition {
  sourceType: 'model' | 'drive'
  sourceValue: string
  vehicleType: VehicleType
  targetType: 'wheels' | 'color' | 'interior' | 'range' | 'drive' | 'towHitch' | 'seats'
  constraintType: 'allow' | 'fixed' | 'disable'
  values: string[] | string
}

export const MODEL_3_CONSTRAINTS: ConstraintDefinition[] = [
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'fixed', values: '18' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: 'standard' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model 3', targetType: 'drive', constraintType: 'fixed', values: 'rwd' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model 3', targetType: 'interior', constraintType: 'fixed', values: 'black' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model 3', targetType: 'color', constraintType: 'allow', values: ['pearl_white', 'diamond_black', 'stealth_grey'] },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model 3', targetType: 'seats', constraintType: 'fixed', values: '5' },

  { sourceType: 'model', sourceValue: 'premium', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'allow', values: ['18', '19'] },
  { sourceType: 'model', sourceValue: 'premium', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'premium', vehicleType: 'Model 3', targetType: 'color', constraintType: 'allow', values: ['pearl_white', 'diamond_black', 'stealth_grey', 'marine_blue', 'ultra_red', 'quicksilver'] },
  { sourceType: 'model', sourceValue: 'premium', vehicleType: 'Model 3', targetType: 'seats', constraintType: 'fixed', values: '5' },

  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'wheels', constraintType: 'fixed', values: '20' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'towHitch', constraintType: 'disable', values: [] },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'color', constraintType: 'allow', values: ['pearl_white', 'diamond_black', 'stealth_grey', 'marine_blue', 'ultra_red', 'quicksilver'] },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model 3', targetType: 'seats', constraintType: 'fixed', values: '5' },
]

export const MODEL_Y_CONSTRAINTS: ConstraintDefinition[] = [
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'range', constraintType: 'fixed', values: 'standard' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'wheels', constraintType: 'allow', values: ['18', '19'] },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'drive', constraintType: 'fixed', values: 'rwd' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'color', constraintType: 'allow', values: ['pearl_white', 'diamond_black', 'stealth_grey', 'glacier_blue', 'ultra_red', 'quicksilver'] },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model Y', targetType: 'seats', constraintType: 'fixed', values: '5' },

  { sourceType: 'model', sourceValue: 'premium', vehicleType: 'Model Y', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'premium', vehicleType: 'Model Y', targetType: 'wheels', constraintType: 'allow', values: ['19', '20'] },
  { sourceType: 'model', sourceValue: 'premium', vehicleType: 'Model Y', targetType: 'color', constraintType: 'allow', values: ['pearl_white', 'diamond_black', 'stealth_grey', 'glacier_blue', 'ultra_red', 'quicksilver'] },
  { sourceType: 'model', sourceValue: 'premium', vehicleType: 'Model Y', targetType: 'seats', constraintType: 'allow', values: ['5', '7'] },

  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'wheels', constraintType: 'fixed', values: '21' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'color', constraintType: 'allow', values: ['pearl_white', 'diamond_black', 'stealth_grey', 'glacier_blue', 'ultra_red', 'quicksilver'] },
  { sourceType: 'model', sourceValue: 'performance', vehicleType: 'Model Y', targetType: 'seats', constraintType: 'fixed', values: '5' },
]

export const MODEL_S_CONSTRAINTS: ConstraintDefinition[] = [
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model S', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model S', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model S', targetType: 'towHitch', constraintType: 'disable', values: [] },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model S', targetType: 'seats', constraintType: 'fixed', values: '5' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model S', targetType: 'wheels', constraintType: 'allow', values: ['19', '21'] },

  { sourceType: 'model', sourceValue: 'plaid', vehicleType: 'Model S', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'plaid', vehicleType: 'Model S', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'plaid', vehicleType: 'Model S', targetType: 'towHitch', constraintType: 'disable', values: [] },
  { sourceType: 'model', sourceValue: 'plaid', vehicleType: 'Model S', targetType: 'seats', constraintType: 'fixed', values: '5' },
  { sourceType: 'model', sourceValue: 'plaid', vehicleType: 'Model S', targetType: 'wheels', constraintType: 'fixed', values: '21' },
]

export const MODEL_X_CONSTRAINTS: ConstraintDefinition[] = [
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model X', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model X', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model X', targetType: 'seats', constraintType: 'allow', values: ['5', '6', '7'] },
  { sourceType: 'model', sourceValue: 'standard', vehicleType: 'Model X', targetType: 'wheels', constraintType: 'allow', values: ['20', '22'] },

  { sourceType: 'model', sourceValue: 'plaid', vehicleType: 'Model X', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'plaid', vehicleType: 'Model X', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'plaid', vehicleType: 'Model X', targetType: 'seats', constraintType: 'allow', values: ['5', '6'] },
  { sourceType: 'model', sourceValue: 'plaid', vehicleType: 'Model X', targetType: 'wheels', constraintType: 'allow', values: ['20', '22'] },
]

export const CYBERTRUCK_CONSTRAINTS: ConstraintDefinition[] = [
  { sourceType: 'model', sourceValue: 'awd', vehicleType: 'Cybertruck', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'awd', vehicleType: 'Cybertruck', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'awd', vehicleType: 'Cybertruck', targetType: 'towHitch', constraintType: 'fixed', values: 'ja' },
  { sourceType: 'model', sourceValue: 'awd', vehicleType: 'Cybertruck', targetType: 'seats', constraintType: 'fixed', values: '5' },
  { sourceType: 'model', sourceValue: 'awd', vehicleType: 'Cybertruck', targetType: 'wheels', constraintType: 'fixed', values: '20' },
  { sourceType: 'model', sourceValue: 'awd', vehicleType: 'Cybertruck', targetType: 'color', constraintType: 'fixed', values: 'stainless_steel' },

  { sourceType: 'model', sourceValue: 'cyberbeast', vehicleType: 'Cybertruck', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'cyberbeast', vehicleType: 'Cybertruck', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'cyberbeast', vehicleType: 'Cybertruck', targetType: 'towHitch', constraintType: 'fixed', values: 'ja' },
  { sourceType: 'model', sourceValue: 'cyberbeast', vehicleType: 'Cybertruck', targetType: 'seats', constraintType: 'fixed', values: '5' },
  { sourceType: 'model', sourceValue: 'cyberbeast', vehicleType: 'Cybertruck', targetType: 'wheels', constraintType: 'fixed', values: '20' },
  { sourceType: 'model', sourceValue: 'cyberbeast', vehicleType: 'Cybertruck', targetType: 'color', constraintType: 'fixed', values: 'stainless_steel' },
]

export const ROADSTER_CONSTRAINTS: ConstraintDefinition[] = [
  { sourceType: 'model', sourceValue: 'base', vehicleType: 'Roadster', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'base', vehicleType: 'Roadster', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'base', vehicleType: 'Roadster', targetType: 'towHitch', constraintType: 'disable', values: [] },
  { sourceType: 'model', sourceValue: 'base', vehicleType: 'Roadster', targetType: 'seats', constraintType: 'fixed', values: '4' },
  { sourceType: 'model', sourceValue: 'base', vehicleType: 'Roadster', targetType: 'wheels', constraintType: 'fixed', values: 'nv' },

  { sourceType: 'model', sourceValue: 'founders', vehicleType: 'Roadster', targetType: 'range', constraintType: 'fixed', values: 'maximale_reichweite' },
  { sourceType: 'model', sourceValue: 'founders', vehicleType: 'Roadster', targetType: 'drive', constraintType: 'fixed', values: 'awd' },
  { sourceType: 'model', sourceValue: 'founders', vehicleType: 'Roadster', targetType: 'towHitch', constraintType: 'disable', values: [] },
  { sourceType: 'model', sourceValue: 'founders', vehicleType: 'Roadster', targetType: 'seats', constraintType: 'fixed', values: '4' },
  { sourceType: 'model', sourceValue: 'founders', vehicleType: 'Roadster', targetType: 'wheels', constraintType: 'fixed', values: 'nv' },
]

export const DRIVE_CONSTRAINTS: ConstraintDefinition[] = [
  { sourceType: 'drive', sourceValue: 'rwd', vehicleType: 'Model Y', targetType: 'seats', constraintType: 'fixed', values: '5' },
]

export const ALL_CONSTRAINTS = [
  ...MODEL_3_CONSTRAINTS,
  ...MODEL_Y_CONSTRAINTS,
  ...MODEL_S_CONSTRAINTS,
  ...MODEL_X_CONSTRAINTS,
  ...CYBERTRUCK_CONSTRAINTS,
  ...ROADSTER_CONSTRAINTS,
  ...DRIVE_CONSTRAINTS,
]

export function applyVehicleConstraints(data: Record<string, unknown>): Record<string, unknown> {
  const vehicleType = data.vehicleType as VehicleType
  const model = (data.model as string)?.toLowerCase() || ''
  const result = { ...data }
  const modelConstraints = ALL_CONSTRAINTS.filter(
    (constraint) =>
      constraint.vehicleType === vehicleType &&
      constraint.sourceType === 'model' &&
      constraint.sourceValue === model
  )

  for (const constraint of modelConstraints) {
    if (constraint.constraintType === 'fixed') {
      result[constraint.targetType] = constraint.values
    } else if (constraint.constraintType === 'disable') {
      result[constraint.targetType] = constraint.targetType === 'towHitch' ? 'nv' : null
    }
  }

  return result
}
