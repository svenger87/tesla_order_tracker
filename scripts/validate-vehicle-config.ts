import assert from 'node:assert/strict'
import {
  ALL_CONSTRAINTS,
  applyVehicleConstraints,
} from '../src/lib/vehicle-constraints'
import {
  AUTOPILOT_OPTIONS,
  COLORS,
  CYBERTRUCK_TRIMS,
  CYBERTRUCK_WHEELS,
  DRIVES,
  INTERIORS,
  MODEL_3_TRIMS,
  MODEL_3_WHEELS,
  MODEL_S_TRIMS,
  MODEL_S_WHEELS,
  MODEL_X_TRIMS,
  MODEL_X_WHEELS,
  MODEL_Y_TRIMS,
  MODEL_Y_WHEELS,
  RANGES,
  ROADSTER_TRIMS,
  ROADSTER_WHEELS,
  SEATS_OPTIONS,
  TOW_HITCH_OPTIONS,
  VEHICLE_TYPES,
  VehicleType,
} from '../src/lib/types'

const optionsByTarget = {
  color: COLORS,
  interior: INTERIORS,
  range: RANGES,
  drive: DRIVES,
  towHitch: TOW_HITCH_OPTIONS,
  autopilot: AUTOPILOT_OPTIONS,
  seats: SEATS_OPTIONS,
} as const

const trimsByVehicle: Record<VehicleType, { value: string; label: string }[]> = {
  'Model Y': MODEL_Y_TRIMS,
  'Model 3': MODEL_3_TRIMS,
  'Model S': MODEL_S_TRIMS,
  'Model X': MODEL_X_TRIMS,
  Cybertruck: CYBERTRUCK_TRIMS,
  Roadster: ROADSTER_TRIMS,
}

const wheelsByVehicle: Record<VehicleType, { value: string; label: string }[]> = {
  'Model Y': MODEL_Y_WHEELS,
  'Model 3': MODEL_3_WHEELS,
  'Model S': MODEL_S_WHEELS,
  'Model X': MODEL_X_WHEELS,
  Cybertruck: CYBERTRUCK_WHEELS,
  Roadster: ROADSTER_WHEELS,
}

function optionValues(targetType: string, vehicleType: VehicleType): Set<string> {
  if (targetType === 'wheels') {
    return new Set(wheelsByVehicle[vehicleType].map((option) => option.value))
  }

  return new Set(optionsByTarget[targetType as keyof typeof optionsByTarget].map((option) => option.value))
}

function constraintValues(values: string[] | string): string[] {
  return Array.isArray(values) ? values : [values]
}

for (const vehicle of VEHICLE_TYPES) {
  assert.ok(trimsByVehicle[vehicle.value].length > 0, `${vehicle.value} needs at least one trim`)
  assert.ok(wheelsByVehicle[vehicle.value].length > 0, `${vehicle.value} needs at least one wheel option`)
}

for (const constraint of ALL_CONSTRAINTS) {
  const sourceValues = constraint.sourceType === 'model'
    ? trimsByVehicle[constraint.vehicleType].map((option) => option.value)
    : DRIVES.map((option) => option.value)

  assert.ok(
    sourceValues.includes(constraint.sourceValue),
    `${constraint.vehicleType}:${constraint.sourceType}:${constraint.sourceValue} must reference an existing source option`
  )

  if (constraint.constraintType === 'disable') continue

  const allowedValues = optionValues(constraint.targetType, constraint.vehicleType)
  for (const value of constraintValues(constraint.values)) {
    assert.ok(
      allowedValues.has(value),
      `${constraint.vehicleType}:${constraint.sourceValue}:${constraint.targetType} references unknown value "${value}"`
    )
  }
}

assert.deepEqual(
  constraintValues(ALL_CONSTRAINTS.find((constraint) =>
    constraint.vehicleType === 'Model X' &&
    constraint.sourceValue === 'plaid' &&
    constraint.targetType === 'seats'
  )?.values ?? []),
  ['5', '6'],
  'Model X Plaid should allow 5 or 6 seats'
)

assert.equal(
  applyVehicleConstraints({ vehicleType: 'Cybertruck', model: 'awd', towHitch: 'nein' }).towHitch,
  'ja',
  'Cybertruck should store tow hitch as present'
)

assert.equal(
  applyVehicleConstraints({ vehicleType: 'Roadster', model: 'base', seats: '5', wheels: '20' }).seats,
  '4',
  'Roadster should store 4 seats'
)

console.log(`Validated ${ALL_CONSTRAINTS.length} vehicle constraints.`)
