import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { query, execute, generateId, nowISO } from '@/lib/db'
import { COUNTRIES } from '@/lib/types'

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const apiKey = request.headers.get('X-API-Key')
  const validApiKey = process.env.EXTERNAL_API_KEY
  if (apiKey && validApiKey && apiKey === validApiKey) return true
  const admin = await getAdminFromCookie()
  return !!admin
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const existingCountries = await query<{ value: string }>(
      `SELECT value FROM "Option" WHERE type = 'country' AND isActive = 1`,
    )
    const existingValues = new Set(existingCountries.map((c) => c.value))

    const missingCountries = COUNTRIES.filter((c) => !existingValues.has(c.value))

    if (missingCountries.length === 0) {
      return NextResponse.json({ message: 'All countries already exist', added: 0, total: COUNTRIES.length })
    }

    let addedCount = 0
    for (const country of missingCountries) {
      try {
        const now = nowISO()
        await execute(
          `INSERT INTO "Option" (id, type, value, label, metadata, sortOrder, isActive, createdAt, updatedAt)
           VALUES (?, 'country', ?, ?, ?, ?, 1, ?, ?)`,
          [generateId(), country.value, country.label, JSON.stringify({ flag: country.flag }), COUNTRIES.findIndex((c) => c.value === country.value), now, now],
        )
        addedCount++
      } catch {
        // Skip duplicates
      }
    }

    return NextResponse.json({
      message: `Added ${addedCount} missing countries`,
      added: addedCount,
      countries: missingCountries.map((c) => c.label),
      total: COUNTRIES.length,
    })
  } catch (error) {
    console.error('Failed to seed countries:', error)
    return NextResponse.json({ error: 'Failed to seed countries' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const existingCountries = await query<{ value: string; label: string }>(
      `SELECT value, label FROM "Option" WHERE type = 'country' AND isActive = 1 ORDER BY label ASC`,
    )
    const existingValues = new Set(existingCountries.map((c) => c.value))

    const missingCountries = COUNTRIES.filter((c) => !existingValues.has(c.value))

    return NextResponse.json({
      existing: existingCountries.length,
      missing: missingCountries.length,
      missingCountries: missingCountries.map((c) => ({ value: c.value, label: c.label })),
      total: COUNTRIES.length,
    })
  } catch (error) {
    console.error('Failed to check countries:', error)
    return NextResponse.json({ error: 'Failed to check countries' }, { status: 500 })
  }
}
