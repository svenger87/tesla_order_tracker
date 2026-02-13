import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { withApiAuth } from '@/lib/api-auth'
import { createApiSuccessResponse, ApiErrors } from '@/lib/api-response'
import { ApiOptions, ApiOption } from '@/lib/api-types'
import {
  COUNTRIES,
  MODELS,
  RANGES,
  DRIVES,
  COLORS,
  INTERIORS,
  WHEELS,
  AUTOPILOT_OPTIONS,
  TOW_HITCH_OPTIONS,
} from '@/lib/types'

// Valid option types
const VALID_TYPES = [
  'country',
  'model',
  'range',
  'drive',
  'color',
  'interior',
  'wheels',
  'autopilot',
  'towHitch',
  'deliveryLocation',
] as const
type OptionType = (typeof VALID_TYPES)[number]

function isValidType(type: string): type is OptionType {
  return VALID_TYPES.includes(type as OptionType)
}

// Convert hardcoded options to ApiOption format
function toApiOptions<T extends { value: string; label: string }>(
  options: T[]
): ApiOption[] {
  return options.map((opt) => {
    const { value, label, ...rest } = opt
    return {
      value,
      label,
      metadata: Object.keys(rest).length > 0 ? rest : undefined,
    }
  })
}

// GET /api/v1/options - Get all dropdown options
export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('type')

    // Validate type filter if provided
    if (typeFilter && !isValidType(typeFilter)) {
      return ApiErrors.validationError(
        `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
      )
    }

    // Fetch database options
    const dbOptions = await prisma.option.findMany({
      where: {
        isActive: true,
        ...(typeFilter ? { type: typeFilter } : {}),
      },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
      select: {
        type: true,
        value: true,
        label: true,
        metadata: true,
      },
    })

    // Group database options by type
    const dbOptionsByType: Record<string, ApiOption[]> = {}
    for (const opt of dbOptions) {
      if (!dbOptionsByType[opt.type]) {
        dbOptionsByType[opt.type] = []
      }
      dbOptionsByType[opt.type].push({
        value: opt.value,
        label: opt.label,
        metadata: opt.metadata ? JSON.parse(opt.metadata) : undefined,
      })
    }

    // Build response - use DB options if available, fall back to hardcoded
    const buildOptions = (
      type: string,
      fallback: ApiOption[]
    ): ApiOption[] => {
      const options = dbOptionsByType[type]?.length > 0 ? dbOptionsByType[type] : fallback
      // Sort countries alphabetically with German locale for proper umlaut handling
      if (type === 'country') {
        return options.sort((a, b) =>
          a.label.localeCompare(b.label, 'de', { sensitivity: 'base' })
        )
      }
      return options
    }

    // If filtering by type, return just that type's options
    if (typeFilter) {
      const fallbacks: Record<string, ApiOption[]> = {
        country: toApiOptions(COUNTRIES),
        model: toApiOptions(MODELS),
        range: toApiOptions(RANGES),
        drive: toApiOptions(DRIVES),
        color: toApiOptions(COLORS),
        interior: toApiOptions(INTERIORS),
        wheels: toApiOptions(WHEELS),
        autopilot: toApiOptions(AUTOPILOT_OPTIONS),
        towHitch: toApiOptions(TOW_HITCH_OPTIONS),
        deliveryLocation: [],
      }

      const options = buildOptions(typeFilter, fallbacks[typeFilter] || [])
      return createApiSuccessResponse({ [typeFilter]: options })
    }

    // Return all options grouped by type
    const allOptions: ApiOptions = {
      country: buildOptions('country', toApiOptions(COUNTRIES)),
      model: buildOptions('model', toApiOptions(MODELS)),
      range: buildOptions('range', toApiOptions(RANGES)),
      drive: buildOptions('drive', toApiOptions(DRIVES)),
      color: buildOptions('color', toApiOptions(COLORS)),
      interior: buildOptions('interior', toApiOptions(INTERIORS)),
      wheels: buildOptions('wheels', toApiOptions(WHEELS)),
      autopilot: buildOptions('autopilot', toApiOptions(AUTOPILOT_OPTIONS)),
      towHitch: buildOptions('towHitch', toApiOptions(TOW_HITCH_OPTIONS)),
      deliveryLocation: buildOptions('deliveryLocation', []),
    }

    return createApiSuccessResponse(allOptions)
  } catch (error) {
    console.error('API v1 options error:', error)
    return ApiErrors.serverError('Failed to fetch options')
  }
})
