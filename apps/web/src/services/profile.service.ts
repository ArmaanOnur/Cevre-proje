/**
 * ProfileService — T2 Service Layer
 * Wraps all profile-related Supabase operations.
 */

import { createClient } from '@/lib/supabase'

export class ProfileService {
  private static get db() {
    return createClient()
  }

  /** Get profile by UUID */
  static async getById(userId: string) {
    const { data, error } = await this.db
      .from('users')
      .select(`
        id, username, full_name, bio, avatar_url, cover_image_url,
        location_name, neighborhood_id, phone, is_verified, is_active,
        trust_score, total_activities, followers_count, following_count,
        created_at, updated_at,
        neighborhood:neighborhoods(id, name, city)
      `)
      .eq('id', userId)
      .eq('is_active', true)
      .single()
    return { data, error }
  }

  /** Get profile by username */
  static async getByUsername(username: string) {
    const { data, error } = await this.db
      .from('users')
      .select(`
        id, username, full_name, bio, avatar_url, cover_image_url,
        location_name, neighborhood_id, is_verified, is_active,
        trust_score, total_activities, followers_count, following_count,
        created_at, updated_at,
        neighborhood:neighborhoods(id, name, city)
      `)
      .eq('username', username)
      .eq('is_active', true)
      .single()
    return { data, error }
  }

  /** Update own profile */
  static async update(userId: string, updates: Record<string, unknown>) {
    const { data, error } = await this.db
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  }

  /** Check if username is available */
  static async checkUsername(username: string): Promise<boolean> {
    const { data } = await this.db
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    return data === null
  }

  /** Upload avatar to storage and update profile */
  static async uploadAvatar(userId: string, file: File): Promise<string> {
    const db = this.db
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `avatars/${userId}.${ext}`
    const { error: uploadError } = await db.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadError) throw new Error(uploadError.message)
    const { data } = db.storage.from('avatars').getPublicUrl(path)
    // Update profile with new avatar URL
    await this.update(userId, { avatar_url: data.publicUrl })
    return data.publicUrl
  }

  /** Get user's activity cards */
  static async getUserCards(userId: string, limit = 20) {
    const { data, error } = await this.db
      .from('activity_cards')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  }

  /** Soft-delete account */
  static async deactivate(userId: string) {
    const { error } = await this.db
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', userId)
    return { error }
  }
}
