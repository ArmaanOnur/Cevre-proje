/**
 * CardService — T1 Service Layer
 * Wraps all activity-card Supabase operations.
 * Hooks → CardService → Supabase (never hooks → Supabase directly).
 */

import { createClient } from '@/lib/supabase'

export interface CardFilters {
  category?: string
  lat?: number
  lng?: number
  radiusKm?: number
  userId?: string
  status?: 'active' | 'completed' | 'cancelled'
  limit?: number
  offset?: number
}

export class CardService {
  private static get db() {
    return createClient()
  }

  /** Fetch cards with optional geo + category filtering */
  static async getCards(filters: CardFilters = {}) {
    const { lat, lng, radiusKm = 10, category, userId, status = 'active', limit = 20, offset = 0 } = filters

    // Geo filter via PostGIS RPC when coordinates provided
    if (lat !== undefined && lng !== undefined) {
      const { data, error } = await this.db.rpc('get_cards_within_radius', {
        lat,
        lng,
        radius_km: radiusKm,
        p_category: category ?? null,
        p_limit: limit,
        p_offset: offset,
      })
      return { data, error }
    }

    // Fallback: standard query
    let query = this.db
      .from('activity_cards')
      .select(`
        *,
        profiles!creator_id(id, username, avatar_url, full_name),
        card_participants(count)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) query = query.eq('category', category)
    if (userId) query = query.eq('creator_id', userId)

    const { data, error } = await query
    return { data, error }
  }

  /** Get a single card by ID with full details */
  static async getCard(cardId: string) {
    const { data, error } = await this.db
      .from('activity_cards')
      .select(`
        *,
        profiles!creator_id(id, username, avatar_url, full_name, bio),
        card_participants(
          user_id,
          joined_at,
          status,
          profiles(id, username, avatar_url)
        ),
        card_comments(count)
      `)
      .eq('id', cardId)
      .single()
    return { data, error }
  }

  /** Create a new activity card */
  static async createCard(payload: {
    title: string
    description: string
    category: string
    location: { lat: number; lng: number; address?: string }
    scheduled_at?: string
    max_participants?: number
    is_public?: boolean
    tags?: string[]
  }) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    const { location, ...rest } = payload
    const { data, error } = await db
      .from('activity_cards')
      .insert({
        ...rest,
        creator_id: user.id,
        location: `POINT(${location.lng} ${location.lat})`,
        address: location.address,
        status: 'active',
      })
      .select()
      .single()
    return { data, error }
  }

  /** Join an activity card */
  static async joinCard(cardId: string) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    const { data, error } = await db
      .from('card_participants')
      .insert({ card_id: cardId, user_id: user.id, status: 'joined' })
      .select()
      .single()
    return { data, error }
  }

  /** Leave an activity card */
  static async leaveCard(cardId: string) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    const { error } = await db
      .from('card_participants')
      .delete()
      .eq('card_id', cardId)
      .eq('user_id', user.id)
    return { error }
  }

  /** Like / unlike a card */
  static async toggleLike(cardId: string) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { liked: false, error: new Error('Not authenticated') }

    // Check existing like
    const { data: existing } = await db
      .from('card_likes')
      .select('id')
      .eq('card_id', cardId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      const { error } = await db
        .from('card_likes')
        .delete()
        .eq('card_id', cardId)
        .eq('user_id', user.id)
      return { liked: false, error }
    } else {
      const { error } = await db
        .from('card_likes')
        .insert({ card_id: cardId, user_id: user.id })
      return { liked: true, error }
    }
  }

  /** Real-time subscription for new cards in area */
  static subscribeToNewCards(
    callback: (card: unknown) => void
  ) {
    return this.db
      .channel('new-cards')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_cards' }, (payload) => {
        callback(payload.new)
      })
      .subscribe()
  }
}
