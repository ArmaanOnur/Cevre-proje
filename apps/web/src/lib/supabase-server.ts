/**
 * supabase-server.ts — T3
 *
 * Server-side Supabase client factory using @supabase/ssr.
 * Use this ONLY in:
 *   - Server Components (async functions)
 *   - Route Handlers (route.ts)
 *   - Server Actions
 *
 * For middleware, use createMiddlewareClient() instead.
 */

import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@cevre/supabase'

/**
 * Creates a Supabase client for Server Components and Route Handlers.
 * Reads and writes session cookies via next/headers.
 */
export function createServerClient() {
  const cookieStore = cookies()

  return _createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Component'te cookie set edilemez — middleware halleder
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Server Component'te cookie remove edilemez — middleware halleder
          }
        },
      },
    }
  )
}

/**
 * Gets the current session from cookies (Server Components).
 * Returns null if no active session.
 */
export async function getServerSession() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Gets the current user from cookies (Server Components).
 * Uses getUser() which validates against Supabase (more secure than getSession).
 */
export async function getServerUser() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
