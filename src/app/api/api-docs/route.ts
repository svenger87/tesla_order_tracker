import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

// Cache the spec to avoid reading the file on every request
let cachedSpec: object | null = null

export async function GET() {
  try {
    // Return cached spec in production
    if (cachedSpec && process.env.NODE_ENV === 'production') {
      return NextResponse.json(cachedSpec)
    }

    // Read the OpenAPI YAML file
    const specPath = path.join(process.cwd(), 'docs', 'openapi', 'openapi.yaml')
    const specContent = fs.readFileSync(specPath, 'utf8')

    // Parse YAML to JSON
    const spec = yaml.load(specContent) as object

    // Cache for production
    if (process.env.NODE_ENV === 'production') {
      cachedSpec = spec
    }

    return NextResponse.json(spec)
  } catch (error) {
    console.error('Failed to load OpenAPI spec:', error)
    return NextResponse.json(
      { error: 'Failed to load API documentation' },
      { status: 500 }
    )
  }
}
