import { queryOne, execute, nowISO } from '@/lib/db'
import { transformSettingsRow, type SettingsRow } from '@/lib/db-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

async function getOrCreateSettings() {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM "Settings" WHERE id = ?`,
    ['default'],
  )
  if (row) return transformSettingsRow(row)

  const now = nowISO()
  await execute(
    `INSERT INTO "Settings" (id, showDonation, donationUrl, donationText, lastSyncTime, lastSyncCount, archiveEnabled, archiveThreshold, updatedAt)
     VALUES (?, 1, ?, ?, NULL, NULL, 1, 180, ?)`,
    ['default', 'https://buymeacoffee.com', 'Dieses Projekt unterstützen', now],
  )
  return {
    id: 'default',
    showDonation: true,
    donationUrl: 'https://buymeacoffee.com',
    donationText: 'Dieses Projekt unterstützen',
    lastSyncTime: null,
    lastSyncCount: null,
    archiveEnabled: true,
    archiveThreshold: 180,
    updatedAt: now,
  } as SettingsRow
}

export async function GET() {
  try {
    const settings = await getOrCreateSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    console.error('TURSO_DATABASE_URL set:', !!process.env.TURSO_DATABASE_URL)
    console.error('TURSO_AUTH_TOKEN set:', !!process.env.TURSO_AUTH_TOKEN)
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

    const now = nowISO()
    await execute(
      `UPDATE "Settings" SET showDonation = ?, donationUrl = ?, donationText = ?, archiveEnabled = ?, archiveThreshold = ?, updatedAt = ?
       WHERE id = ?`,
      [
        (body.showDonation ?? true) ? 1 : 0,
        body.donationUrl || 'https://buymeacoffee.com',
        body.donationText || 'Support this project',
        (body.archiveEnabled ?? true) ? 1 : 0,
        body.archiveThreshold ?? 180,
        now,
        'default',
      ],
    )

    const settings = await getOrCreateSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Failed to update settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
