import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

const SPREADSHEET_ID = '1--3lNLMSUDwxgcpqrYh4Fbz8LONLBfbJwOIftKgzaSA'

async function debugQ3Columns() {
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

  // Show header row
  console.log('=== Q3 Sheet (gid=0) Column Structure ===\n')
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine)
  console.log('Headers:')
  headers.forEach((h, i) => {
    const col = String.fromCharCode(65 + i) // A, B, C, ...
    console.log(`  ${col} (${i}): "${h}"`)
  })

  // Show first few data rows
  console.log('\n=== Sample Data Rows ===\n')
  for (let i = 1; i <= 5 && i < lines.length; i++) {
    const row = parseCSVLine(lines[i])
    if (row[0]) {  // Has name
      console.log(`Row ${i}: ${row[0]}`)
      console.log(`  Column T (19): "${row[19] || ''}"`)
      console.log(`  Column U (20): "${row[20] || ''}"`)
      console.log(`  Column L (11): "${row[11] || ''}" (deliveryLocation)`)
    }
  }

  // Find a row with data in column T or U
  console.log('\n=== Rows with delivery-related data ===\n')
  let found = 0
  for (let i = 1; i < lines.length && found < 10; i++) {
    const row = parseCSVLine(lines[i])
    if (row[0] && (row[19] || row[20])) {
      console.log(`${row[0]}: T="${row[19] || ''}", U="${row[20] || ''}"`)
      found++
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

debugQ3Columns().catch(console.error)
