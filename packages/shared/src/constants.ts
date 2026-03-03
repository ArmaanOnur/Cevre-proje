import type { ActivityCategory } from '@cevre/supabase'

// ─── Aktivite Kategorileri ────────────────────────────────────────────────────

export const ACTIVITY_CATEGORIES: {
  value: ActivityCategory
  label: string
  emoji: string
  color: string
}[] = [
  { value: 'kahve',   label: 'Kahve',         emoji: '☕', color: '#8B5E3C' },
  { value: 'spor',    label: 'Spor',          emoji: '⚽', color: '#27AE60' },
  { value: 'muzik',   label: 'Müzik',         emoji: '🎵', color: '#9B59B6' },
  { value: 'kitap',   label: 'Kitap',         emoji: '📚', color: '#E67E22' },
  { value: 'oyun',    label: 'Oyun',          emoji: '🎮', color: '#2980B9' },
  { value: 'yuruyus', label: 'Yürüyüş',       emoji: '🚶', color: '#1ABC9C' },
  { value: 'sinema',  label: 'Sinema',        emoji: '🎬', color: '#E74C3C' },
  { value: 'yemek',   label: 'Yemek',         emoji: '🍽️', color: '#F39C12' },
  { value: 'sanat',   label: 'Sanat',         emoji: '🎨', color: '#E91E63' },
  { value: 'dil',     label: 'Dil Takası',    emoji: '💬', color: '#00BCD4' },
  { value: 'diger',   label: 'Diğer',         emoji: '✨', color: '#95A5A6' },
]

export const CATEGORY_MAP = Object.fromEntries(
  ACTIVITY_CATEGORIES.map(c => [c.value, c])
) as Record<ActivityCategory, typeof ACTIVITY_CATEGORIES[0]>

// ─── Kart Ayarları ────────────────────────────────────────────────────────────

export const CARD_DEFAULTS = {
  MAX_PARTICIPANTS: 8,
  MIN_PARTICIPANTS: 2,
  DURATION_OPTIONS_HOURS: [1, 2, 3, 4, 6],
  DEFAULT_DURATION_HOURS: 2,
  DEFAULT_RADIUS_METERS: 5000,
  MAX_TITLE_LENGTH: 80,
  MAX_DESCRIPTION_LENGTH: 300,
} as const

// ─── Konum & Harita ───────────────────────────────────────────────────────────

export const MAP_DEFAULTS = {
  // İstanbul merkezi
  DEFAULT_LAT: 41.0082,
  DEFAULT_LNG: 28.9784,
  DEFAULT_ZOOM: 13,
  NEARBY_RADIUS_METERS: 5000,
} as const

export const PILOT_DISTRICTS = [
  { name: 'Kadıköy',   lat: 40.9869, lng: 29.0264 },
  { name: 'Beşiktaş',  lat: 41.0422, lng: 29.0067 },
  { name: 'Şişli',     lat: 41.0602, lng: 28.9877 },
] as const

// ─── UI Renkleri ──────────────────────────────────────────────────────────────

export const COLORS = {
  primary:      '#1A8F7E',
  primaryLight: '#E8F5F3',
  primaryMid:   '#A8D8D3',
  secondary:    '#E67E22',
  secondaryLt:  '#FEF3E2',
  dark:         '#1A1A2E',
  gray:         '#6B7280',
  grayLight:    '#F3F4F6',
  white:        '#FFFFFF',
  error:        '#E74C3C',
  success:      '#27AE60',
  warning:      '#F39C12',
} as const

// ─── Uygulama Sabitleri ───────────────────────────────────────────────────────

export const APP_CONFIG = {
  NAME: 'Çevre',
  TAGLINE: 'Gerçek Hayat Sosyal Keşif',
  SUPPORT_EMAIL: 'destek@cevre.app',
  MIN_AGE: 18,
  OTP_RESEND_SECONDS: 60,
  SESSION_TIMEOUT_DAYS: 30,
  MAX_REPORTS_BEFORE_REVIEW: 3,
} as const

// ─── Abonelik Planları ────────────────────────────────────────────────────────

export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Ücretsiz',
    price: 0,
    monthlyCardLimit: 3,
    features: [
      'Aylık 3 aktivite kartı',
      'Mahalle çevrelerine katılım',
      'Temel profil',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Çevre+',
    price: 49,
    monthlyCardLimit: Infinity,
    features: [
      'Sınırsız aktivite kartı',
      'Kimler favoriledinizi görme',
      'Premium aktivite filtreleri',
      'Haftalık sosyal rapor',
      'Öncelikli mekan yerleşimi',
    ],
  },
} as const

// ─── Validation ───────────────────────────────────────────────────────────────

export const VALIDATION = {
  PHONE_REGEX: /^(\+90|0)?[0-9]{10}$/,
  DISPLAY_NAME_MIN: 2,
  DISPLAY_NAME_MAX: 50,
  BIO_MAX: 200,
} as const
