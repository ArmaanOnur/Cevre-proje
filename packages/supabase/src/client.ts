import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type TypedSupabaseClient = SupabaseClient<Database>

// ─── Web Client ───────────────────────────────────────────────────────────────
export function createWebClient(): TypedSupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY env değişkenleri eksik'
    )
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  })
}

// ─── Mobile Client (Expo SecureStore ile) ────────────────────────────────────
export function createMobileClient(
  storageAdapter?: {
    getItem: (key: string) => Promise<string | null>
    setItem: (key: string, value: string) => Promise<void>
    removeItem: (key: string) => Promise<void>
  }
): TypedSupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY env değişkenleri eksik'
    )
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storage: storageAdapter,
    },
  })
}

// ─── Singleton pattern (her platform kendi singleton'ını tutar) ───────────────
let _webClient: TypedSupabaseClient | null = null

export function getWebClient(): TypedSupabaseClient {
  if (!_webClient) _webClient = createWebClient()
  return _webClient
}
