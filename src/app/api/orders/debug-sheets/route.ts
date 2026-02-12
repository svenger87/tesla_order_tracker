import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'

const SPREADSHEET_ID = '1--3lNLMSUDwxgcpqrYh4Fbz8LONLBfbJwOIftKgzaSA'

const SHEET_GIDS = [
  { gid: '0', label: 'Q3 2025' },
  { gid: '957284045', label: 'Q4 2025' },
  { gid: '1666102380', label: 'Current Quarter' },
]

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        currentCell += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentCell.trim())
        currentCell = ''
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentCell.trim())
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow)
        }
        currentRow = []
        currentCell = ''
        if (char === '\r') i++
      } else if (char !== '\r') {
        currentCell += char
      }
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some(cell => cell !== '')) {
      rows.push(currentRow)
    }
  }

  return rows
}

async function fetchCSV(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`

  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
  }

  return response.text()
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const results = []

    for (const sheet of SHEET_GIDS) {
      try {
        const csvText = await fetchCSV(sheet.gid)
        const rows = parseCSV(csvText)

        // Count non-empty rows
        const nonEmptyRows = rows.filter(r => r.some(cell => cell.trim() !== ''))

        // Get first column values (should be names)
        const namesInFirstColumn = rows.slice(1).map(r => r[0]).filter(Boolean)

        results.push({
          label: sheet.label,
          gid: sheet.gid,
          totalRows: rows.length,
          nonEmptyRows: nonEmptyRows.length,
          headerRow: rows[0] || [],
          namesFound: namesInFirstColumn.length,
          firstFewNames: namesInFirstColumn.slice(0, 5),
          sampleDataRow: rows[1] ? rows[1].slice(0, 6) : [],
        })
      } catch (error) {
        results.push({
          label: sheet.label,
          gid: sheet.gid,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({ sheets: results })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
