import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
// Force reload after schema update

async function getOrCreateSettings() {
  let settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: 'default',
        showDonation: true,
        donationUrl: 'https://buymeacoffee.com',
        donationText: 'Dieses Projekt unterstützen',
        lastSyncTime: null,
        lastSyncCount: null,
        archiveEnabled: true,
        archiveThreshold: 180,
      },
    })
  }
  return settings
}

export async function GET() {
  try {
    const settings = await getOrCreateSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    // Return default settings to prevent frontend crash
    return NextResponse.json({
      id: 'default',
      showDonation: false,
      donationUrl: '',
      donationText: '',
      lastSyncTime: null,
      lastSyncCount: null,
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const body = await request.json()

    await getOrCreateSettings()

    // Only what the request actually carries. This used to fall back to a
    // default for every absent field, so a partial update silently reset the
    // rest — a request that meant to change one thing wiped the others back to
    // "Support this project" and 180 days.
    const data: Record<string, unknown> = {}
    if (body.showDonation !== undefined) data.showDonation = Boolean(body.showDonation)
    if (body.donationUrl !== undefined) data.donationUrl = String(body.donationUrl)
    if (body.paypalUrl !== undefined) data.paypalUrl = String(body.paypalUrl)
    if (body.donationText !== undefined) data.donationText = String(body.donationText)
    if (body.archiveEnabled !== undefined) data.archiveEnabled = Boolean(body.archiveEnabled)
    if (body.archiveThreshold !== undefined) data.archiveThreshold = Number(body.archiveThreshold)

    // An empty field means "not set" and clears the bar, so null has to survive
    // the trip rather than being read as "absent".
    if (body.yearlyGoal !== undefined) {
      data.yearlyGoal = body.yearlyGoal === null || body.yearlyGoal === '' ? null : Number(body.yearlyGoal)
    }
    if (body.yearlyRaised !== undefined) {
      data.yearlyRaised = body.yearlyRaised === null || body.yearlyRaised === '' ? null : Number(body.yearlyRaised)
    }

    const settings = await prisma.settings.update({
      where: { id: 'default' },
      data,
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Failed to update settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
