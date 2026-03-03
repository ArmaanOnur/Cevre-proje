import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  supabaseUser: User | null
  profile: any | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: any | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  supabaseUser: null,
  profile: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  setSession: (session) =>
    set({
      session,
      supabaseUser: session?.user ?? null,
      isAuthenticated: !!session,
    }),

  setProfile: (profile) => set({ profile }),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () =>
    set({
      supabaseUser: null,
      profile: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
    }),
}))
