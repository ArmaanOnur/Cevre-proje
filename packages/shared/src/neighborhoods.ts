// packages/shared/src/neighborhoods.ts

import type { Neighborhood, User, ActivityCard, NeighborhoodRole } from '@cevre/supabase'

// Mahalle detay verisi (üyeler ve aktiviteler dahil)
export interface NeighborhoodDetailData extends Neighborhood {
  members: {
    user_id: string
    role: NeighborhoodRole
    joined_at: string
    user: Pick<User, 'id' | 'display_name' | 'avatar_url' | 'verified_at'>
  }[]
  recent_cards?: (ActivityCard & {
    creator: Pick<User, 'id' | 'display_name' | 'avatar_url'>
  })[]
}

// Mahalle istatistikleri
export interface NeighborhoodStats {
  total_members: number
  active_cards: number
  total_activities: number
  recent_joins: number // Son 7 gün
}

// Türkiye şehirleri (pilot için)
export const PILOT_CITIES = [
  { id: 'istanbul', name: 'İstanbul', emoji: '🏙️' },
  { id: 'ankara', name: 'Ankara', emoji: '🏛️' },
  { id: 'izmir', name: 'İzmir', emoji: '🌊' },
] as const

// İstanbul ilçeleri (pilot için)
export const ISTANBUL_DISTRICTS = [
  'Kadıköy', 'Beşiktaş', 'Şişli', 'Beyoğlu', 'Üsküdar',
  'Bakırköy', 'Kartal', 'Maltepe', 'Ataşehir', 'Sarıyer',
] as const

// Mahalle rolü etiketleri
export function getNeighborhoodRoleLabel(role: NeighborhoodRole): {
  label: string
  color: string
  emoji: string
} {
  const map: Record<NeighborhoodRole, { label: string; color: string; emoji: string }> = {
    member: { label: 'Üye', color: '#6B7280', emoji: '👤' },
    moderator: { label: 'Moderatör', color: '#F59E0B', emoji: '⚡' },
    admin: { label: 'Yönetici', color: '#8B5CF6', emoji: '👑' },
  }
  return map[role]
}

// Mahalle üye sayısı formatı
export function formatMemberCount(count: number): string {
  if (count < 1000) return `${count} üye`
  if (count < 10_000) return `${(count / 1000).toFixed(1)}k üye`
  return `${Math.floor(count / 1000)}k üye`
}

// Mahalle adı slug'a çevir (URL için)
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
