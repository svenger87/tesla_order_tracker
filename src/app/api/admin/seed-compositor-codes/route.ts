import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { validateApiKey } from '@/lib/api-auth'

import { VehicleType } from '@/lib/types'

interface CodeDefinition {
  category: 'body' | 'wheel' | 'interior' | 'color'
  vehicleType: VehicleType
  lookupKey: string
  code: string
  label?: string
  sortOrder?: number
}

// Verified Tesla compositor codes (Feb 2026)
// Body codes per trim+drive combo
const BODY_CODES: CodeDefinition[] = [
  // Model Y Juniper
  { category: 'body', vehicleType: 'Model Y', lookupKey: 'standard_rwd', code: 'MTY61', label: 'Standard RWD' },
  { category: 'body', vehicleType: 'Model Y', lookupKey: 'standard_awd', code: 'MTY77', label: 'Standard AWD' },
  { category: 'body', vehicleType: 'Model Y', lookupKey: 'premium_rwd', code: 'MTY60', label: 'Premium RWD' },
  { category: 'body', vehicleType: 'Model Y', lookupKey: 'premium_awd', code: 'MTY48', label: 'Premium AWD' },
  { category: 'body', vehicleType: 'Model Y', lookupKey: 'performance', code: 'MTY70', label: 'Performance' },
  // Model 3 Highland
  { category: 'body', vehicleType: 'Model 3', lookupKey: 'standard_rwd', code: 'MT367', label: 'Standard RWD' },
  { category: 'body', vehicleType: 'Model 3', lookupKey: 'premium_rwd', code: 'MT369', label: 'Premium RWD' },
  { category: 'body', vehicleType: 'Model 3', lookupKey: 'premium_awd', code: 'MT370', label: 'Premium AWD' },
  { category: 'body', vehicleType: 'Model 3', lookupKey: 'performance', code: 'MT371', label: 'Performance' },
]

// Wheel codes per size
const WHEEL_CODES: CodeDefinition[] = [
  // Model Y Juniper
  { category: 'wheel', vehicleType: 'Model Y', lookupKey: '18', code: 'WY18P', label: '18" Aperture', sortOrder: 0 },
  { category: 'wheel', vehicleType: 'Model Y', lookupKey: '19', code: 'WY19P', label: '19" Nova', sortOrder: 1 },
  { category: 'wheel', vehicleType: 'Model Y', lookupKey: '20', code: 'WY20B', label: '20" Helix', sortOrder: 2 },
  { category: 'wheel', vehicleType: 'Model Y', lookupKey: '21', code: 'WY21A', label: '21" Arachnid', sortOrder: 3 },
  // Model 3 Highland
  { category: 'wheel', vehicleType: 'Model 3', lookupKey: '18_standard', code: 'W38C', label: '18" (Standard)', sortOrder: 0 },
  { category: 'wheel', vehicleType: 'Model 3', lookupKey: '18_premium', code: 'W38A', label: '18" (Premium)', sortOrder: 1 },
  { category: 'wheel', vehicleType: 'Model 3', lookupKey: '19', code: 'W39S', label: '19" Sport', sortOrder: 2 },
  { category: 'wheel', vehicleType: 'Model 3', lookupKey: '20', code: 'W30A', label: '20" Performance', sortOrder: 3 },
]

// Interior codes per trim+interior combo
const INTERIOR_CODES: CodeDefinition[] = [
  // Model Y Juniper
  { category: 'interior', vehicleType: 'Model Y', lookupKey: 'standard_black', code: 'IBB3', label: 'Standard Schwarz' },
  // Standard MY Juniper only comes in black — no white interior option
  { category: 'interior', vehicleType: 'Model Y', lookupKey: 'premium_black', code: 'IPB12', label: 'Premium Schwarz' },
  { category: 'interior', vehicleType: 'Model Y', lookupKey: 'premium_white', code: 'IPW12', label: 'Premium Weiß' },
  { category: 'interior', vehicleType: 'Model Y', lookupKey: 'performance_black', code: 'IPB14', label: 'Performance Schwarz' },
  { category: 'interior', vehicleType: 'Model Y', lookupKey: 'performance_white', code: 'IPW14', label: 'Performance Weiß' },
  // Model 3 Highland
  { category: 'interior', vehicleType: 'Model 3', lookupKey: 'standard_black', code: 'IBB4', label: 'Standard Schwarz' },
  { category: 'interior', vehicleType: 'Model 3', lookupKey: 'premium_black', code: 'IPB2', label: 'Premium Schwarz' },
  { category: 'interior', vehicleType: 'Model 3', lookupKey: 'premium_white', code: 'IPW2', label: 'Premium Weiß' },
  { category: 'interior', vehicleType: 'Model 3', lookupKey: 'premium_awd_black', code: 'IPB3', label: 'Premium AWD Schwarz' },
  { category: 'interior', vehicleType: 'Model 3', lookupKey: 'premium_awd_white', code: 'IPW3', label: 'Premium AWD Weiß' },
  { category: 'interior', vehicleType: 'Model 3', lookupKey: 'performance_black', code: 'IPB4', label: 'Performance Schwarz' },
  { category: 'interior', vehicleType: 'Model 3', lookupKey: 'performance_white', code: 'IPW4', label: 'Performance Weiß' },
]

// Color codes (shared across vehicles)
const COLOR_CODES: CodeDefinition[] = [
  // Current colors
  { category: 'color', vehicleType: 'Model Y', lookupKey: 'pearl_white', code: 'PPSW', label: 'Pearl White', sortOrder: 0 },
  { category: 'color', vehicleType: 'Model Y', lookupKey: 'solid_black', code: 'PBSB', label: 'Solid Black', sortOrder: 1 },
  { category: 'color', vehicleType: 'Model Y', lookupKey: 'diamond_black', code: 'PX02', label: 'Diamond Black', sortOrder: 2 },
  { category: 'color', vehicleType: 'Model Y', lookupKey: 'stealth_grey', code: 'PN01', label: 'Stealth Grey', sortOrder: 3 },
  { category: 'color', vehicleType: 'Model Y', lookupKey: 'quicksilver', code: 'PN00', label: 'Quicksilver', sortOrder: 4 },
  { category: 'color', vehicleType: 'Model Y', lookupKey: 'ultra_red', code: 'PR01', label: 'Ultra Red', sortOrder: 5 },
  { category: 'color', vehicleType: 'Model Y', lookupKey: 'glacier_blue', code: 'PB01', label: 'Glacier Blue', sortOrder: 6 },
  { category: 'color', vehicleType: 'Model Y', lookupKey: 'marine_blue', code: 'PB02', label: 'Marine Blue', sortOrder: 7 },
  { category: 'color', vehicleType: 'Model Y', lookupKey: 'deep_blue', code: 'PPSB', label: 'Deep Blue Metallic', sortOrder: 8 },
  { category: 'color', vehicleType: 'Model Y', lookupKey: 'midnight_cherry', code: 'PR00', label: 'Midnight Cherry Red', sortOrder: 9 },
  // Legacy MY colors
  { category: 'color', vehicleType: 'Model Y', lookupKey: 'midnight_silver', code: 'PMNG', label: 'Midnight Silver Metallic', sortOrder: 20 },
  { category: 'color', vehicleType: 'Model Y', lookupKey: 'red_multi', code: 'PPMR', label: 'Red Multi-Coat', sortOrder: 21 },
  { category: 'color', vehicleType: 'Model Y', lookupKey: 'silver_metallic', code: 'PMSS', label: 'Silver Metallic', sortOrder: 22 },

  // Model 3 colors (same codes)
  { category: 'color', vehicleType: 'Model 3', lookupKey: 'pearl_white', code: 'PPSW', label: 'Pearl White', sortOrder: 0 },
  { category: 'color', vehicleType: 'Model 3', lookupKey: 'solid_black', code: 'PBSB', label: 'Solid Black', sortOrder: 1 },
  { category: 'color', vehicleType: 'Model 3', lookupKey: 'diamond_black', code: 'PX02', label: 'Diamond Black', sortOrder: 2 },
  { category: 'color', vehicleType: 'Model 3', lookupKey: 'stealth_grey', code: 'PN01', label: 'Stealth Grey', sortOrder: 3 },
  { category: 'color', vehicleType: 'Model 3', lookupKey: 'quicksilver', code: 'PN00', label: 'Quicksilver', sortOrder: 4 },
  { category: 'color', vehicleType: 'Model 3', lookupKey: 'ultra_red', code: 'PR01', label: 'Ultra Red', sortOrder: 5 },
  { category: 'color', vehicleType: 'Model 3', lookupKey: 'marine_blue', code: 'PB02', label: 'Marine Blue', sortOrder: 6 },
  { category: 'color', vehicleType: 'Model 3', lookupKey: 'deep_blue', code: 'PPSB', label: 'Deep Blue Metallic', sortOrder: 7 },
  { category: 'color', vehicleType: 'Model 3', lookupKey: 'midnight_cherry', code: 'PR00', label: 'Midnight Cherry Red', sortOrder: 8 },
  // Legacy M3 colors
  { category: 'color', vehicleType: 'Model 3', lookupKey: 'midnight_silver', code: 'PMNG', label: 'Midnight Silver Metallic', sortOrder: 20 },
  { category: 'color', vehicleType: 'Model 3', lookupKey: 'red_multi', code: 'PPMR', label: 'Red Multi-Coat', sortOrder: 21 },
  { category: 'color', vehicleType: 'Model 3', lookupKey: 'silver_metallic', code: 'PMSS', label: 'Silver Metallic', sortOrder: 22 },
]

// Model S codes (verified from TeslaHunt, timdorr/tesla-api, compositor URLs)
const MODEL_S_BODY_CODES: CodeDefinition[] = [
  { category: 'body', vehicleType: 'Model S', lookupKey: 'standard', code: 'MTS13', label: 'Dual Motor AWD' },
  { category: 'body', vehicleType: 'Model S', lookupKey: 'plaid', code: 'MTS14', label: 'Plaid Tri Motor AWD' },
]

const MODEL_S_WHEEL_CODES: CodeDefinition[] = [
  { category: 'wheel', vehicleType: 'Model S', lookupKey: '19', code: 'WS90', label: '19" Tempest', sortOrder: 0 },
  { category: 'wheel', vehicleType: 'Model S', lookupKey: '21', code: 'WS10', label: '21" Arachnid', sortOrder: 1 },
]

const MODEL_S_INTERIOR_CODES: CodeDefinition[] = [
  { category: 'interior', vehicleType: 'Model S', lookupKey: 'standard_black', code: 'IBC00', label: 'Carbon & Schwarz' },
  { category: 'interior', vehicleType: 'Model S', lookupKey: 'standard_white', code: 'IWC00', label: 'Carbon & Weiß' },
  { category: 'interior', vehicleType: 'Model S', lookupKey: 'standard_cream', code: 'ICC00', label: 'Carbon & Creme' },
  { category: 'interior', vehicleType: 'Model S', lookupKey: 'plaid_black', code: 'IBC00', label: 'Carbon & Schwarz' },
  { category: 'interior', vehicleType: 'Model S', lookupKey: 'plaid_white', code: 'IWC00', label: 'Carbon & Weiß' },
  { category: 'interior', vehicleType: 'Model S', lookupKey: 'plaid_cream', code: 'ICC00', label: 'Carbon & Creme' },
]

const MODEL_S_COLOR_CODES: CodeDefinition[] = [
  { category: 'color', vehicleType: 'Model S', lookupKey: 'pearl_white', code: 'PPSW', label: 'Pearl White', sortOrder: 0 },
  { category: 'color', vehicleType: 'Model S', lookupKey: 'solid_black', code: 'PBSB', label: 'Solid Black', sortOrder: 1 },
  { category: 'color', vehicleType: 'Model S', lookupKey: 'diamond_black', code: 'PX02', label: 'Diamond Black', sortOrder: 2 },
  { category: 'color', vehicleType: 'Model S', lookupKey: 'stealth_grey', code: 'PN01', label: 'Stealth Grey', sortOrder: 3 },
  { category: 'color', vehicleType: 'Model S', lookupKey: 'quicksilver', code: 'PN00', label: 'Quicksilver', sortOrder: 4 },
  { category: 'color', vehicleType: 'Model S', lookupKey: 'ultra_red', code: 'PR01', label: 'Ultra Red', sortOrder: 5 },
  { category: 'color', vehicleType: 'Model S', lookupKey: 'deep_blue', code: 'PPSB', label: 'Deep Blue Metallic', sortOrder: 6 },
  { category: 'color', vehicleType: 'Model S', lookupKey: 'midnight_cherry', code: 'PR00', label: 'Midnight Cherry Red', sortOrder: 7 },
]

// Model X codes (verified from TeslaHunt, timdorr/tesla-api)
const MODEL_X_BODY_CODES: CodeDefinition[] = [
  { category: 'body', vehicleType: 'Model X', lookupKey: 'standard', code: 'MTX13', label: 'Dual Motor AWD' },
  { category: 'body', vehicleType: 'Model X', lookupKey: 'plaid', code: 'MTX14', label: 'Plaid Tri Motor AWD' },
]

const MODEL_X_WHEEL_CODES: CodeDefinition[] = [
  { category: 'wheel', vehicleType: 'Model X', lookupKey: '20', code: 'WX00', label: '20" Cyberstream', sortOrder: 0 },
  { category: 'wheel', vehicleType: 'Model X', lookupKey: '22', code: 'WX20', label: '22" Turbine', sortOrder: 1 },
]

const MODEL_X_INTERIOR_CODES: CodeDefinition[] = [
  { category: 'interior', vehicleType: 'Model X', lookupKey: 'standard_black', code: 'IBC00', label: 'Carbon & Schwarz' },
  { category: 'interior', vehicleType: 'Model X', lookupKey: 'standard_white', code: 'IWC00', label: 'Carbon & Weiß' },
  { category: 'interior', vehicleType: 'Model X', lookupKey: 'standard_cream', code: 'ICC00', label: 'Carbon & Creme' },
  { category: 'interior', vehicleType: 'Model X', lookupKey: 'plaid_black', code: 'IBC00', label: 'Carbon & Schwarz' },
  { category: 'interior', vehicleType: 'Model X', lookupKey: 'plaid_white', code: 'IWC00', label: 'Carbon & Weiß' },
  { category: 'interior', vehicleType: 'Model X', lookupKey: 'plaid_cream', code: 'ICC00', label: 'Carbon & Creme' },
]

const MODEL_X_COLOR_CODES: CodeDefinition[] = [
  { category: 'color', vehicleType: 'Model X', lookupKey: 'pearl_white', code: 'PPSW', label: 'Pearl White', sortOrder: 0 },
  { category: 'color', vehicleType: 'Model X', lookupKey: 'solid_black', code: 'PBSB', label: 'Solid Black', sortOrder: 1 },
  { category: 'color', vehicleType: 'Model X', lookupKey: 'diamond_black', code: 'PX02', label: 'Diamond Black', sortOrder: 2 },
  { category: 'color', vehicleType: 'Model X', lookupKey: 'stealth_grey', code: 'PN01', label: 'Stealth Grey', sortOrder: 3 },
  { category: 'color', vehicleType: 'Model X', lookupKey: 'quicksilver', code: 'PN00', label: 'Quicksilver', sortOrder: 4 },
  { category: 'color', vehicleType: 'Model X', lookupKey: 'ultra_red', code: 'PR01', label: 'Ultra Red', sortOrder: 5 },
  { category: 'color', vehicleType: 'Model X', lookupKey: 'deep_blue', code: 'PPSB', label: 'Deep Blue Metallic', sortOrder: 6 },
  { category: 'color', vehicleType: 'Model X', lookupKey: 'midnight_cherry', code: 'PR00', label: 'Midnight Cherry Red', sortOrder: 7 },
]

// Cybertruck codes (verified from cybertruckownersclub.com, compositor URLs)
const CYBERTRUCK_BODY_CODES: CodeDefinition[] = [
  { category: 'body', vehicleType: 'Cybertruck', lookupKey: 'awd', code: 'MTC03', label: 'Dual Motor AWD' },
  { category: 'body', vehicleType: 'Cybertruck', lookupKey: 'cyberbeast', code: 'MTC04', label: 'Tri Motor Cyberbeast' },
]

const CYBERTRUCK_WHEEL_CODES: CodeDefinition[] = [
  { category: 'wheel', vehicleType: 'Cybertruck', lookupKey: '20', code: 'WH0B', label: '20" Cyber Wheels', sortOrder: 0 },
]

const CYBERTRUCK_INTERIOR_CODES: CodeDefinition[] = [
  { category: 'interior', vehicleType: 'Cybertruck', lookupKey: 'awd_black', code: 'IG01', label: 'Schwarz' },
  { category: 'interior', vehicleType: 'Cybertruck', lookupKey: 'awd_white', code: 'IW01', label: 'Weiß' },
  { category: 'interior', vehicleType: 'Cybertruck', lookupKey: 'cyberbeast_black', code: 'IG01', label: 'Schwarz' },
  { category: 'interior', vehicleType: 'Cybertruck', lookupKey: 'cyberbeast_white', code: 'IW01', label: 'Weiß' },
]

const CYBERTRUCK_COLOR_CODES: CodeDefinition[] = [
  { category: 'color', vehicleType: 'Cybertruck', lookupKey: 'stainless_steel', code: 'PDD', label: 'Stainless Steel', sortOrder: 0 },
]

// Roadster - no verified compositor codes yet (not in production)
const ROADSTER_BODY_CODES: CodeDefinition[] = [
  { category: 'body', vehicleType: 'Roadster', lookupKey: 'base', code: 'MTR00', label: 'Base (unverified)' },
  { category: 'body', vehicleType: 'Roadster', lookupKey: 'founders', code: 'MTR01', label: 'Founders Series (unverified)' },
]

const ALL_CODES = [
  ...BODY_CODES, ...WHEEL_CODES, ...INTERIOR_CODES, ...COLOR_CODES,
  ...MODEL_S_BODY_CODES, ...MODEL_S_WHEEL_CODES, ...MODEL_S_INTERIOR_CODES, ...MODEL_S_COLOR_CODES,
  ...MODEL_X_BODY_CODES, ...MODEL_X_WHEEL_CODES, ...MODEL_X_INTERIOR_CODES, ...MODEL_X_COLOR_CODES,
  ...CYBERTRUCK_BODY_CODES, ...CYBERTRUCK_WHEEL_CODES, ...CYBERTRUCK_INTERIOR_CODES, ...CYBERTRUCK_COLOR_CODES,
  ...ROADSTER_BODY_CODES,
]

// POST - Seed compositor codes from verified data
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
    const reset = searchParams.get('reset') === 'true'

    if (reset && !dryRun) {
      await prisma.compositorCode.deleteMany({})
    }

    const results = {
      total: ALL_CODES.length,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const code of ALL_CODES) {
      const existing = await prisma.compositorCode.findUnique({
        where: {
          category_vehicleType_lookupKey: {
            category: code.category,
            vehicleType: code.vehicleType,
            lookupKey: code.lookupKey,
          },
        },
      })

      if (existing && !reset) {
        results.skipped++
        continue
      }

      if (dryRun) {
        results.created++
        continue
      }

      try {
        await prisma.compositorCode.upsert({
          where: {
            category_vehicleType_lookupKey: {
              category: code.category,
              vehicleType: code.vehicleType,
              lookupKey: code.lookupKey,
            },
          },
          create: {
            category: code.category,
            vehicleType: code.vehicleType,
            lookupKey: code.lookupKey,
            code: code.code,
            label: code.label,
            sortOrder: code.sortOrder ?? 0,
            isActive: true,
          },
          update: {
            code: code.code,
            label: code.label,
            sortOrder: code.sortOrder ?? 0,
            isActive: true,
          },
        })
        results.created++
      } catch (err) {
        results.errors.push(`${code.category}/${code.vehicleType}/${code.lookupKey}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({ success: true, dryRun, reset, ...results })
  } catch (error) {
    console.error('Failed to seed compositor codes:', error)
    return NextResponse.json({ error: 'Failed to seed compositor codes' }, { status: 500 })
  }
}

// GET - List seed data
export async function GET(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) {
    const { valid } = validateApiKey(request)
    if (!valid) {
      return NextResponse.json({ error: 'Admin access or API key required' }, { status: 401 })
    }
  }

  return NextResponse.json({
    totalCount: ALL_CODES.length,
    bodyCodes: BODY_CODES.length,
    wheelCodes: WHEEL_CODES.length,
    interiorCodes: INTERIOR_CODES.length,
    colorCodes: COLOR_CODES.length,
    codes: ALL_CODES,
  })
}
