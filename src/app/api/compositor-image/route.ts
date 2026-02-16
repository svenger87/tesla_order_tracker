import { NextRequest, NextResponse } from 'next/server'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import { join } from 'path'

const CACHE_DIR = process.env.NODE_ENV === 'production'
  ? '/app/data/compositor-cache'
  : join(process.cwd(), '.compositor-cache')
const MANIFEST_PATH = join(CACHE_DIR, 'manifest.json')

function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true })
  }
}

function buildParamKey(model: string, options: string, view: string, size: string): string {
  return `${model}_${options}_${view}_${size}`
}

function buildCacheKey(paramKey: string): string {
  return createHash('md5').update(paramKey).digest('hex')
}

// Read manifest: { paramKey: hash, ... }
function readManifest(): Record<string, string> {
  try {
    if (existsSync(MANIFEST_PATH)) {
      return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
    }
  } catch {}
  return {}
}

// Add entry to manifest
function addToManifest(paramKey: string, hash: string) {
  const manifest = readManifest()
  manifest[paramKey] = hash
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest))
}

// GET /api/compositor-image?manifest=true — returns cached param keys (no 404 noise)
// GET /api/compositor-image?model=my&options=...&size=800&view=STUD_3QTR — serves cached image
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Manifest mode: return all cached param keys
  if (searchParams.get('manifest') === 'true') {
    ensureCacheDir()
    const manifest = readManifest()
    return NextResponse.json(Object.keys(manifest), {
      headers: { 'Cache-Control': 'public, max-age=10' },
    })
  }

  const model = searchParams.get('model')
  const options = searchParams.get('options')
  const view = searchParams.get('view') || 'STUD_3QTR'
  const size = searchParams.get('size') || '800'

  if (!model || !options) {
    return NextResponse.json({ error: 'Missing model or options' }, { status: 400 })
  }

  const paramKey = buildParamKey(model, options, view, size)
  const cacheKey = buildCacheKey(paramKey)
  const cachePath = join(CACHE_DIR, `${cacheKey}.png`)

  ensureCacheDir()
  if (existsSync(cachePath)) {
    // Lazy-rebuild: ensure this entry is in the manifest (handles pre-manifest cached files)
    const manifest = readManifest()
    if (!manifest[paramKey]) {
      addToManifest(paramKey, cacheKey)
    }

    const cached = readFileSync(cachePath)
    return new NextResponse(cached, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800, immutable',
        'X-Cache': 'HIT',
      },
    })
  }

  return new NextResponse(null, { status: 404 })
}

// POST /api/compositor-image — client uploads captured image for caching
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const model = searchParams.get('model')
  const options = searchParams.get('options')
  const view = searchParams.get('view') || 'STUD_3QTR'
  const size = searchParams.get('size') || '800'

  if (!model || !options) {
    return NextResponse.json({ error: 'Missing model or options' }, { status: 400 })
  }

  const paramKey = buildParamKey(model, options, view, size)
  const cacheKey = buildCacheKey(paramKey)
  const cachePath = join(CACHE_DIR, `${cacheKey}.png`)

  ensureCacheDir()

  if (existsSync(cachePath)) {
    return NextResponse.json({ cached: true, key: cacheKey })
  }

  try {
    const buffer = Buffer.from(await request.arrayBuffer())

    if (buffer.length < 1024) {
      return NextResponse.json({ error: 'Image too small' }, { status: 400 })
    }
    if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47) {
      return NextResponse.json({ error: 'Not a valid PNG' }, { status: 400 })
    }

    writeFileSync(cachePath, buffer)
    addToManifest(paramKey, cacheKey)
    return NextResponse.json({ cached: true, key: cacheKey, size: buffer.length })
  } catch (e) {
    console.error('[compositor-cache] Failed to save upload:', e)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
