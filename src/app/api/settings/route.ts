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

    const settings = await prisma.settings.update({
      where: { id: 'default' },
      data: {
        showDonation: body.showDonation ?? true,
        donationUrl: body.donationUrl || 'https://buymeacoffee.com',
        donationText: body.donationText || 'Support this project',
        archiveEnabled: body.archiveEnabled ?? true,
        archiveThreshold: body.archiveThreshold ?? 180,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Failed to update settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
