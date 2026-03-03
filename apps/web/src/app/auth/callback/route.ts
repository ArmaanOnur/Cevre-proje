/**
 * /auth/callback — OAuth callback handler (route.ts)
 * Handles Supabase OAuth (Google, GitHub etc.) code exchange.
 * Also handles magic link redirects.
 *
 * Flow:
 *   1. Supabase redirects here with ?code=...
 *   2. Exchange code for session using @supabase/ssr
 *   3. Redirect to /map (or onboarding if new user)
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import type { Database } from '@cevre/supabase'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/map'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors from Supabase
  if (error) {
    console.error('[auth/callback] OAuth error:', error, errorDescription)
    const errUrl = new URL('/auth', origin)
    errUrl.searchParams.set('error', errorDescription ?? error)
    return NextResponse.redirect(errUrl)
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth', origin))
  }

  const response = NextResponse.redirect(new URL(next, origin))

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options as any })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options as any })
        },
      },
    }
  )

  const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !session) {
    console.error('[auth/callback] Code exchange error:', exchangeError)
    return NextResponse.redirect(new URL('/auth', origin))
  }

  // Check if profile exists (new OAuth user needs onboarding)
  const { data: profile } = await supabase
    .from('users')
    .select('id, username, full_name')
    .eq('id', session.user.id)
    .single()

  const isProfileComplete = Boolean(profile?.username && profile?.full_name)
  const destination = isProfileComplete ? next : '/auth/setup'

  // Update redirect destination if onboarding needed
  if (destination !== next) {
    return NextResponse.redirect(new URL(destination, origin))
  }

  return response
}
