import { createWebClient } from '@cevre/supabase'
import type { TypedSupabaseClient } from '@cevre/supabase'

// Singleton pattern - her render'da yeni client oluşturmaktan kaçın
let client: TypedSupabaseClient | null = null

export function createClient(): TypedSupabaseClient {
  if (!client) {
    client = createWebClient()
  }
  return client
}
