import { NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { COUNTRIES } from '@/lib/types'

// POST /api/admin/seed-countries - Add missing EU countries to the database
export async function POST() {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    // Get existing country values
    const existingCountries = await prisma.option.findMany({
      where: { type: 'country', isActive: true },
      select: { value: true },
    })
    const existingValues = new Set(existingCountries.map((c) => c.value))

    // Find missing countries
    const missingCountries = COUNTRIES.filter((c) => !existingValues.has(c.value))

    if (missingCountries.length === 0) {
      return NextResponse.json({
        message: 'All countries already exist',
        added: 0,
        total: COUNTRIES.length,
      })
    }

    // Add missing countries with proper sort order (alphabetical by label)
    let addedCount = 0
    for (const country of missingCountries) {
      try {
        await prisma.option.create({
          data: {
            type: 'country',
            value: country.value,
            label: country.label,
            metadata: JSON.stringify({ flag: country.flag }),
            sortOrder: COUNTRIES.findIndex((c) => c.value === country.value),
            isActive: true,
          },
        })
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

// GET /api/admin/seed-countries - Check which countries are missing
export async function GET() {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const existingCountries = await prisma.option.findMany({
      where: { type: 'country', isActive: true },
      select: { value: true, label: true },
      orderBy: { label: 'asc' },
    })
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
