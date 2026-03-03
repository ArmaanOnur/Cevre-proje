// packages/shared/src/subscription.ts

export type SubscriptionTier = 'free' | 'plus' | 'premium'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'paused'

export interface Subscription {
  id: string
  user_id: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at: string | null
  canceled_at: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionLimits {
  tier: SubscriptionTier
  max_active_cards: number
  max_skill_swaps: number
  max_neighborhoods: number
  can_create_private_events: boolean
  can_see_advanced_analytics: boolean
  priority_support: boolean
  badge_enabled: boolean
  custom_badge_text: string | null
}

// Plan bilgileri
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Ücretsiz',
    price: 0,
    interval: null,
    color: '#6B7280',
    emoji: '🌱',
    features: [
      '3 aktif etkinlik',
      '2 beceri takası teklifi',
      '3 mahalleye üyelik',
      'Temel özellikler',
    ],
    limits: {
      max_active_cards: 3,
      max_skill_swaps: 2,
      max_neighborhoods: 3,
    },
  },
  plus: {
    name: 'Çevre+',
    price: 49,
    interval: 'month' as const,
    color: '#1A8F7E',
    emoji: '✨',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID,
    features: [
      '10 aktif etkinlik',
      '10 beceri takası teklifi',
      '10 mahalleye üyelik',
      'Özel etkinlik oluşturma',
      'Gelişmiş analitik',
      'Çevre+ rozeti',
    ],
    limits: {
      max_active_cards: 10,
      max_skill_swaps: 10,
      max_neighborhoods: 10,
    },
  },
  premium: {
    name: 'Çevre Premium',
    price: 399,
    interval: 'year' as const,
    color: '#8B5CF6',
    emoji: '👑',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
    features: [
      'Sınırsız etkinlik',
      'Sınırsız beceri takası',
      'Sınırsız mahalle üyeliği',
      'Tüm özellikler',
      'Öncelikli destek',
      'Premium rozeti',
      'Yıllık %33 tasarruf',
    ],
    limits: {
      max_active_cards: -1,
      max_skill_swaps: -1,
      max_neighborhoods: -1,
    },
  },
} as const

// Tier bilgilerini getir
export function getTierInfo(tier: SubscriptionTier) {
  return SUBSCRIPTION_PLANS[tier]
}

// Tier badge
export function getTierBadge(tier: SubscriptionTier): {
  text: string
  color: string
  emoji: string
} | null {
  if (tier === 'free') return null
  const plan = SUBSCRIPTION_PLANS[tier]
  return {
    text: plan.name,
    color: plan.color,
    emoji: plan.emoji,
  }
}

// Limit kontrolü
export function canPerformAction(
  tier: SubscriptionTier,
  action: 'create_card' | 'create_skill_swap' | 'join_neighborhood',
  currentCount: number
): { allowed: boolean; reason?: string } {
  const limits = SUBSCRIPTION_PLANS[tier].limits
  
  let max: number
  let resource: string
  
  switch (action) {
    case 'create_card':
      max = limits.max_active_cards
      resource = 'aktif etkinlik'
      break
    case 'create_skill_swap':
      max = limits.max_skill_swaps
      resource = 'beceri takası teklifi'
      break
    case 'join_neighborhood':
      max = limits.max_neighborhoods
      resource = 'mahalle üyeliği'
      break
  }
  
  if (max === -1) return { allowed: true }
  
  if (currentCount >= max) {
    return {
      allowed: false,
      reason: `${resource} limitine ulaştınız (${max}). Çevre+ ile sınırları kaldırın!`,
    }
  }
  
  return { allowed: true }
}

// Fiyat formatla
export function formatPrice(price: number, interval?: 'month' | 'year'): string {
  if (price === 0) return 'Ücretsiz'
  const formatted = `₺${price}`
  if (interval === 'month') return `${formatted}/ay`
  if (interval === 'year') return `${formatted}/yıl`
  return formatted
}
