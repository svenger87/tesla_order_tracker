// In-memory ring buffer for TOST API debug logs
// Keeps the last N entries, oldest get dropped automatically

export interface TostLogEntry {
  timestamp: string
  method: string
  path: string
  requestBody?: Record<string, unknown>
  responseStatus: number
  responseBody?: Record<string, unknown>
  durationMs: number
}

const MAX_ENTRIES = 100
const entries: TostLogEntry[] = []

export function addTostLog(entry: TostLogEntry) {
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) {
    entries.shift()
  }
}

export function getTostLogs(limit = 50): TostLogEntry[] {
  return entries.slice(-limit).reverse() // newest first
}

export function clearTostLogs() {
  entries.length = 0
}
