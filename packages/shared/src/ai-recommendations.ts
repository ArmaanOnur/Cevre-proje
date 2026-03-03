// packages/shared/src/ai-recommendations.ts

export type InteractionType =
  | 'view'
  | 'join_request'
  | 'join_accept'
  | 'join_decline'
  | 'complete'
  | 'skip'
  | 'favorite'
  | 'share'

export interface UserInteraction {
  id: string
  user_id: string
  target_type: string
  target_id: string
  interaction_type: InteractionType
  weight: number
  context: Record<string, any> | null
  created_at: string
}

export interface UserPreferences {
  user_id: string
  category_scores: Record<string, number>
  skill_interests: string[]
  skill_expertise: string[]
  preferred_districts: string[]
  max_distance_km: number
  preferred_days: string[]
  preferred_hours: number[]
  group_size_preference: 'small' | 'medium' | 'large' | null
  updated_at: string
}

export interface RecommendationScore {
  user_id: string
  item_type: 'card' | 'skill_swap' | 'user'
  item_id: string
  total_score: number
  collaborative_score: number | null
  content_score: number | null
  location_score: number | null
  recency_score: number | null
  reasons: string[]
  generated_at: string
}

// Etkileşim ağırlıkları (skor hesaplaması için)
export const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
  view: 0.1,
  join_request: 0.3,
  join_accept: 1.0,
  join_decline: -0.5,
  complete: 2.0,
  skip: -0.2,
  favorite: 1.5,
  share: 1.2,
}

// Öneri açıklamaları
export function formatRecommendationReason(reason: string): {
  icon: string
  text: string
  color: string
} {
  const reasonMap: Record<string, { icon: string; text: string; color: string }> = {
    'Benzer kullanıcılar katıldı': {
      icon: '👥',
      text: 'Senin gibi kullanıcılar beğendi',
      color: '#3B82F6',
    },
    'Senin ilgi alanında': {
      icon: '⭐',
      text: 'İlgi alanlarınla eşleşiyor',
      color: '#F59E0B',
    },
    'Tercih ettiğin bölgede': {
      icon: '📍',
      text: 'Sık gittiğin bölgede',
      color: '#10B981',
    },
    'Yeni ve popüler': {
      icon: '🔥',
      text: 'Çok ilgi görüyor',
      color: '#EF4444',
    },
  }
  
  return reasonMap[reason] ?? { icon: '✨', text: reason, color: '#6B7280' }
}

// Skor bazlı öncelik
export function getRecommendationPriority(score: number): {
  label: string
  color: string
} {
  if (score >= 1.5) return { label: 'Çok Uygun', color: '#10B981' }
  if (score >= 1.0) return { label: 'Uygun', color: '#3B82F6' }
  if (score >= 0.5) return { label: 'İlgini Çekebilir', color: '#F59E0B' }
  return { label: 'Keşfet', color: '#6B7280' }
}
