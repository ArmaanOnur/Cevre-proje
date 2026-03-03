// packages/supabase/src/ai-recommendation-queries.ts
import type { TypedSupabaseClient } from './client'
import type { InteractionType } from '@cevre/shared'

export const aiRecommendationQueries = {
  // ─── INTERACTION TRACKING ─────────────────────────────────────────────────
  
  /** Kullanıcı etkileşimini kaydet */
  trackInteraction: async (
    supabase: TypedSupabaseClient,
    userId: string,
    targetType: string,
    targetId: string,
    interactionType: InteractionType,
    weight?: number,
    context?: Record<string, any>
  ) => {
    const { data, error } = await supabase.rpc('track_interaction', {
      p_user_id: userId,
      p_target_type: targetType,
      p_target_id: targetId,
      p_interaction_type: interactionType,
      p_weight: weight ?? 1.0,
      p_context: context ? JSON.stringify(context) : null,
    })
    return { data, error }
  },

  /** Kullanıcının etkileşim geçmişi */
  getUserInteractions: (
    supabase: TypedSupabaseClient,
    userId: string,
    limit = 100
  ) =>
    supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),

  // ─── USER PREFERENCES ─────────────────────────────────────────────────────

  /** Kullanıcı tercihlerini getir */
  getUserPreferences: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single(),

  /** Tercihleri manuel güncelle */
  updatePreferences: (
    supabase: TypedSupabaseClient,
    userId: string,
    preferences: Partial<{
      skill_interests: string[]
      preferred_districts: string[]
      max_distance_km: number
      group_size_preference: 'small' | 'medium' | 'large'
    }>
  ) =>
    supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single(),

  /** Tercihleri yenile (ML learning) */
  refreshPreferences: async (supabase: TypedSupabaseClient, userId: string) => {
    const { data, error } = await supabase.rpc('refresh_user_preferences', {
      p_user_id: userId,
    })
    return { data, error }
  },

  // ─── RECOMMENDATIONS ──────────────────────────────────────────────────────

  /** Kart önerileri getir */
  getRecommendedCards: async (
    supabase: TypedSupabaseClient,
    userId: string,
    limit = 20
  ) => {
    const { data, error } = await supabase.rpc('recommend_cards', {
      p_user_id: userId,
      p_limit: limit,
    })
    return { data, error }
  },

  /** Cache'den önerileri getir (hızlı) */
  getCachedRecommendations: (
    supabase: TypedSupabaseClient,
    userId: string,
    itemType: 'card' | 'skill_swap' | 'user',
    limit = 20
  ) =>
    supabase
      .from('recommendation_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('item_type', itemType)
      .order('total_score', { ascending: false })
      .limit(limit),

  /** Benzer kullanıcıları bul */
  findSimilarUsers: async (
    supabase: TypedSupabaseClient,
    userId: string,
    limit = 10
  ) => {
    const { data, error } = await supabase.rpc('find_similar_users', {
      p_user_id: userId,
      p_limit: limit,
    })
    return { data, error }
  },

  // ─── ANALYTICS ────────────────────────────────────────────────────────────

  /** Kullanıcı davranış istatistikleri */
  getUserStats: async (supabase: TypedSupabaseClient, userId: string) => {
    const { data: interactions } = await supabase
      .from('user_interactions')
      .select('interaction_type')
      .eq('user_id', userId)
    
    if (!interactions) return null
    
    const stats = {
      total: interactions.length,
      views: interactions.filter(i => i.interaction_type === 'view').length,
      joins: interactions.filter(i => i.interaction_type === 'join_accept').length,
      completes: interactions.filter(i => i.interaction_type === 'complete').length,
      favorites: interactions.filter(i => i.interaction_type === 'favorite').length,
    }
    
    return stats
  },

  /** Popüler kartlar (genel) */
  getTrendingCards: (supabase: TypedSupabaseClient, limit = 10) =>
    supabase
      .from('user_interactions')
      .select('target_id, count:id')
      .eq('target_type', 'card')
      .in('interaction_type', ['view', 'join_request', 'join_accept'])
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('count', { ascending: false })
      .limit(limit),
}
