import { NextRequest, NextResponse } from 'next/server'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import { join } from 'path'

const COMPOSITOR_BASE = 'https://static-assets.tesla.com/configurator/compositor'
const CACHE_DIR = process.env.NODE_ENV === 'production'
  ? '/app/data/compositor-cache'
  : join(process.cwd(), '.compositor-cache')

// Ensure cache directory exists
function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true })
  }
}

// GET /api/compositor-image?model=my&options=$PPSW,$WY19P,$MTY48,$IPB12&view=STUD_3QTR&size=800
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const model = searchParams.get('model')
  const options = searchParams.get('options')
  const view = searchParams.get('view') || 'STUD_3QTR'
  const size = searchParams.get('size') || '800'

  if (!model || !options) {
    return NextResponse.json({ error: 'Missing model or options' }, { status: 400 })
  }

  // Build cache key from all params
  const cacheKey = createHash('md5')
    .update(`${model}_${options}_${view}_${size}`)
    .digest('hex')
  const cachePath = join(CACHE_DIR, `${cacheKey}.png`)

  // Serve from cache if exists
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

  // Fetch from Tesla compositor
  const params = new URLSearchParams({ bkba_opt: '2', model, options, size, view })
  const teslaUrl = `${COMPOSITOR_BASE}?${params.toString()}`

  try {
    const res = await fetch(teslaUrl, {
      headers: {
        'Accept': 'image/png,image/webp,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      // Prevent Next.js from adding conditional request headers
      cache: 'no-store',
    })

    if (!res.ok) {
      // For 412 or other client errors, return a transparent 1x1 PNG
      // so the frontend image element doesn't break and shows the fallback
      if (res.status === 412 || res.status === 403 || res.status === 404) {
        return new NextResponse(null, {
          status: 404,
          headers: { 'Cache-Control': 'no-cache' },
        })
      }
      return new NextResponse(null, { status: res.status })
    }

    const buffer = Buffer.from(await res.arrayBuffer())

    // Only cache if response is a valid image (> 1KB, not an error page)
    if (buffer.length > 1024) {
      try {
        writeFileSync(cachePath, buffer)
      } catch (e) {
        console.error('[compositor-cache] Failed to write cache:', e)
      }
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800, immutable',
        'X-Cache': 'MISS',
      },
    })
  } catch (error) {
    console.error('[compositor-cache] Fetch failed:', error)
    return new NextResponse(null, { status: 502 })
  }
}
