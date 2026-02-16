import { NextRequest, NextResponse } from 'next/server'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import { join } from 'path'

const CACHE_DIR = process.env.NODE_ENV === 'production'
  ? '/app/data/compositor-cache'
  : join(process.cwd(), '.compositor-cache')

function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true })
  }
}

function buildCacheKey(model: string, options: string, view: string, size: string): string {
  return createHash('md5')
    .update(`${model}_${options}_${view}_${size}`)
    .digest('hex')
}

// GET /api/compositor-image?model=my&options=...&view=STUD_3QTR&size=800
// Serves cached image if available, otherwise returns 404
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const model = searchParams.get('model')
  const options = searchParams.get('options')
  const view = searchParams.get('view') || 'STUD_3QTR'
  const size = searchParams.get('size') || '800'

  if (!model || !options) {
    return NextResponse.json({ error: 'Missing model or options' }, { status: 400 })
  }

  const cacheKey = buildCacheKey(model, options, view, size)
  const cachePath = join(CACHE_DIR, `${cacheKey}.png`)

  ensureCacheDir()
  if (existsSync(cachePath)) {
    const cached = readFileSync(cachePath)
    return new NextResponse(cached, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800, immutable',
        'X-Cache': 'HIT',
      },
    })
  }

  // Not cached — client should load from Tesla CDN directly
  return new NextResponse(null, { status: 404 })
}

// POST /api/compositor-image — client uploads captured image for caching
// Body: PNG blob, query params identify the image
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const model = searchParams.get('model')
  const options = searchParams.get('options')
  const view = searchParams.get('view') || 'STUD_3QTR'
  const size = searchParams.get('size') || '800'

  if (!model || !options) {
    return NextResponse.json({ error: 'Missing model or options' }, { status: 400 })
  }

  const cacheKey = buildCacheKey(model, options, view, size)
  const cachePath = join(CACHE_DIR, `${cacheKey}.png`)

  ensureCacheDir()

  // Don't overwrite existing cache
  if (existsSync(cachePath)) {
    return NextResponse.json({ cached: true, key: cacheKey })
  }

  try {
    const buffer = Buffer.from(await request.arrayBuffer())

    // Validate: must be > 1KB and start with PNG magic bytes
    if (buffer.length < 1024) {
      return NextResponse.json({ error: 'Image too small' }, { status: 400 })
    }
    if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47) {
      return NextResponse.json({ error: 'Not a valid PNG' }, { status: 400 })
    }

    writeFileSync(cachePath, buffer)
    return NextResponse.json({ cached: true, key: cacheKey, size: buffer.length })
  } catch (e) {
    console.error('[compositor-cache] Failed to save upload:', e)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
