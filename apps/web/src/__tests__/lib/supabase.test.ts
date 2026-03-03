/**
 * Supabase client singleton tests
 * Verifies the module-level cache works correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Supabase package before importing our module
vi.mock('@cevre/supabase', () => ({
  createWebClient: vi.fn(() => ({ __mock: true, id: Math.random() })),
}))

describe('lib/supabase singleton', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns the same instance on repeated calls', async () => {
    const { createClient } = await import('@/lib/supabase')
    const a = createClient()
    const b = createClient()
    expect(a).toBe(b)
  })

  it('calls createWebClient exactly once per module load', async () => {
    const { createWebClient } = await import('@cevre/supabase')
    const { createClient } = await import('@/lib/supabase')

    createClient()
    createClient()
    createClient()

    expect(createWebClient).toHaveBeenCalledTimes(1)
  })
})
