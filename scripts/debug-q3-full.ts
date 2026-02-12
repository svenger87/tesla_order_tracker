import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

const SPREADSHEET_ID = '1--3lNLMSUDwxgcpqrYh4Fbz8LONLBfbJwOIftKgzaSA'

async function debugQ3Full() {
  // Q3 sheet has gid=0
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`

  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  const csvText = await response.text()
  const lines = csvText.split('\n')

  // Show all columns from header row and first data row
  console.log('=== Q3 Sheet Full Column Mapping ===\n')

  // Find first real data row (with a name that looks like a username)
  let dataRowIndex = 0
  for (let i = 0; i < lines.length; i++) {
    const row = parseCSVLine(lines[i])
    // Check if first column is a valid username (not header-like)
    if (row[0] && !row[0].includes('(') && !row[0].includes('Name') && row[0].length > 1 && row[0].length < 30) {
      // Check if it has an order date in column B that looks like a date
      if (row[1] && row[1].match(/\d{2}\.\d{2}\.\d{4}/)) {
        dataRowIndex = i
        break
      }
    }
  }

  console.log(`First data row at index: ${dataRowIndex}\n`)

  const dataRow = parseCSVLine(lines[dataRowIndex])
  console.log(`Sample user: ${dataRow[0]}`)
  console.log('\nAll columns:')

  for (let i = 0; i < Math.max(dataRow.length, 26); i++) {
    const col = i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26)
    console.log(`  ${col} (${i}): "${dataRow[i] || ''}"`)
  }

  // Check Q4 and Q1 2026 sheets for comparison
  console.log('\n\n=== Q4 Sheet (gid=957284045) Sample ===\n')
  const urlQ4 = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=957284045`
  const responseQ4 = await fetch(urlQ4, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } })
  const csvQ4 = await responseQ4.text()
  const linesQ4 = csvQ4.split('\n')

  // Find first data row in Q4
  for (let i = 0; i < linesQ4.length; i++) {
    const row = parseCSVLine(linesQ4[i])
    if (row[0] && row[1] && row[1].match(/\d{2}\.\d{2}\.\d{4}/)) {
      console.log(`First data at row ${i}: ${row[0]}`)
      console.log(`  T (19): "${row[19] || ''}"`)
      console.log(`  U (20): "${row[20] || ''}"`)
      break
    }
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }
  result.push(current.trim())
  return result
}

debugQ3Full().catch(console.error)
