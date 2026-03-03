/**
 * middleware.ts — T3 Auth Middleware
 *
 * Route protection strategy:
 *   - PUBLIC routes: /auth, /auth/verify, /auth/setup, /auth/callback
 *   - PROTECTED routes: /map, /feed, /messages, /notifications, /profile
 *   - ROOT (/): redirect based on auth state
 *
 * Rules:
 *   1. Unauthenticated user → protected route → redirect /auth
 *   2. Authenticated + profile complete → auth page → redirect /map
 *   3. Authenticated + profile INCOMPLETE → non-setup auth page → redirect /auth/setup
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

const AUTH_ROUTES = ['/auth']           // login, verify (starts with /auth)
const SETUP_ROUTE = '/auth/setup'       // profile onboarding
const CALLBACK_ROUTE = '/auth/callback' // OAuth callback (never redirect)
const HOME_ROUTE = '/map'               // default authenticated home
const LOGIN_ROUTE = '/auth'             // default unauthenticated home

const PROTECTED_PREFIXES = ['/map', '/feed', '/messages', '/notifications', '/profile']

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

function isAuthRoute(pathname: string) {
  return pathname.startsWith('/auth') && pathname !== CALLBACK_ROUTE
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Never interfere with OAuth callback
  if (pathname === CALLBACK_ROUTE || pathname.startsWith('/auth/callback')) {
    return response
  }

  // Create SSR Supabase client that can read/write cookies in middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options as any })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options as any })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options as any })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options as any })
        },
      },
    }
  )

  // Validate session server-side (uses cookie, no network call)
  const { data: { user } } = await supabase.auth.getUser()

  // ── Root → smart redirect ────────────────────────────────────────────────
  if (pathname === '/') {
    if (!user) return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url))
    // Check if profile is complete (has username field set)
    const { data: profile } = await supabase
      .from('users')
      .select('username, full_name')
      .eq('id', user.id)
      .single()
    const isComplete = Boolean(profile?.username && profile?.full_name)
    return NextResponse.redirect(new URL(isComplete ? HOME_ROUTE : SETUP_ROUTE, request.url))
  }

  // ── Protected route: no session → login ─────────────────────────────────
  if (isProtected(pathname) && !user) {
    const loginUrl = new URL(LOGIN_ROUTE, request.url)
    loginUrl.searchParams.set('redirect', pathname) // preserve destination
    return NextResponse.redirect(loginUrl)
  }

  // ── Auth route: already logged in ────────────────────────────────────────
  if (isAuthRoute(pathname) && user) {
    // Allow /auth/setup even if logged in (incomplete profile)
    if (pathname === SETUP_ROUTE) return response

    // /auth or /auth/verify → check profile completeness
    const { data: profile } = await supabase
      .from('users')
      .select('username, full_name')
      .eq('id', user.id)
      .single()
    const isComplete = Boolean(profile?.username && profile?.full_name)

    return NextResponse.redirect(new URL(isComplete ? HOME_ROUTE : SETUP_ROUTE, request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static (static files)
     *  - _next/image (image optimization)
     *  - favicon.ico, robots.txt, sitemap.xml
     *  - Files with extensions (e.g. .svg, .png, .jpg, .css, .js)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*$).*)',
  ],
}
