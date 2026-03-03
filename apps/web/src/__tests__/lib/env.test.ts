/**
 * env.ts validation tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('lib/env', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    Object.assign(process.env, originalEnv)
    vi.resetModules()
  })

  it('exports env object with expected keys', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
    const { env } = await import('@/lib/env')
    expect(env).toHaveProperty('NEXT_PUBLIC_SUPABASE_URL')
    expect(env).toHaveProperty('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    expect(env).toHaveProperty('NEXT_PUBLIC_APP_URL')
    expect(env).toHaveProperty('NEXT_PUBLIC_APP_NAME')
  })

  it('defaults NEXT_PUBLIC_APP_URL to localhost:3001', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const { env } = await import('@/lib/env')
    expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3001')
  })

  it('feature flags default to false', async () => {
    delete process.env.NEXT_PUBLIC_ENABLE_LIVE_STREAMING
    delete process.env.NEXT_PUBLIC_ENABLE_AI_RECOMMENDATIONS
    delete process.env.NEXT_PUBLIC_ENABLE_MONETIZATION
    const { env } = await import('@/lib/env')
    expect(env.NEXT_PUBLIC_ENABLE_LIVE_STREAMING).toBe(false)
    expect(env.NEXT_PUBLIC_ENABLE_AI_RECOMMENDATIONS).toBe(false)
    expect(env.NEXT_PUBLIC_ENABLE_MONETIZATION).toBe(false)
  })

  it('feature flags parse true when set to "true"', async () => {
    process.env.NEXT_PUBLIC_ENABLE_LIVE_STREAMING = 'true'
    const { env } = await import('@/lib/env')
    expect(env.NEXT_PUBLIC_ENABLE_LIVE_STREAMING).toBe(true)
  })
})
