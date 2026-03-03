import { NextResponse } from 'next/server'

/**
 * GET /api/health
 * Lightweight liveness probe for container orchestration / uptime monitors.
 * Does NOT hit the database — pure Node.js process info.
 */
export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      version: process.env.npm_package_version ?? '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV ?? 'development',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    }
  )
}
