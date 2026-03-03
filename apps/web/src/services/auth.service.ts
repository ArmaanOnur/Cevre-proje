/**
 * AuthService — T1 Service Layer
 * Wraps all auth-related Supabase calls. Hooks must go through this,
 * not call supabase directly, to enable testability + T2 CQRS prep.
 */

import type { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

export type AuthResult<T> =
  | { data: T; error: null }
  | { data: null; error: AuthError | Error }

export class AuthService {
  private static get db() {
    return createClient()
  }

  /** Sign in with email + password */
  static async signIn(
    email: string,
    password: string
  ): Promise<AuthResult<{ user: User; session: Session }>> {
    const { data, error } = await this.db.auth.signInWithPassword({ email, password })
    if (error) return { data: null, error }
    return { data: { user: data.user, session: data.session }, error: null }
  }

  /** Sign up with email + password */
  static async signUp(
    email: string,
    password: string,
    metadata?: { full_name?: string; username?: string }
  ): Promise<AuthResult<{ user: User | null; session: Session | null }>> {
    const { data, error } = await this.db.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })
    if (error) return { data: null, error }
    return { data: { user: data.user, session: data.session }, error: null }
  }

  /** Sign out */
  static async signOut(): Promise<AuthResult<void>> {
    const { error } = await this.db.auth.signOut()
    if (error) return { data: null, error }
    return { data: undefined, error: null }
  }

  /** Get current session (non-reactive) */
  static async getSession(): Promise<AuthResult<Session | null>> {
    const { data, error } = await this.db.auth.getSession()
    if (error) return { data: null, error }
    return { data: data.session, error: null }
  }

  /** Get current user profile from `profiles` table */
  static async getProfile(userId: string) {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  }

  /** Update profile fields */
  static async updateProfile(userId: string, updates: Record<string, unknown>) {
    const { data, error } = await this.db
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  }

  /** Listen to auth state changes */
  static onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    return this.db.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null, session ?? null)
    })
  }

  /** OAuth sign-in (Google, GitHub, etc.) */
  static async signInWithOAuth(
    provider: 'google' | 'github' | 'apple',
    redirectTo?: string
  ) {
    const { data, error } = await this.db.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo ?? `${window.location.origin}/auth/callback` },
    })
    return { data, error }
  }

  /** Reset password email */
  static async resetPassword(email: string) {
    const { data, error } = await this.db.auth.resetPasswordForEmail(email)
    return { data, error }
  }
}
