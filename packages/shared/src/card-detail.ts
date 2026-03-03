// packages/shared/src/card-detail.ts

import type { ActivityCard, CardJoin, User } from '@cevre/supabase'

// Kart detay sayfasında kullanılan zengin tipler
export interface CardDetailData extends ActivityCard {
  creator: Pick<User, 'id' | 'display_name' | 'avatar_url' | 'verified_at'>
  joins: (CardJoin & {
    user: Pick<User, 'id' | 'display_name' | 'avatar_url' | 'verified_at'>
  })[]
  lat?: number
  lng?: number
}

export interface SafetyLog {
  id: string
  user_id: string
  card_id: string
  safe_ping_at: string | null
  emergency_contact_id: string | null
  created_at: string
}

// Katılım durumu kullanıcı perspektifinden
export type MyJoinStatus =
  | 'not_joined'   // Hiç istek gönderilmemiş
  | 'pending'      // İstek bekliyor
  | 'accepted'     // Kabul edildi
  | 'declined'     // Reddedildi
  | 'cancelled'    // İptal edildi
  | 'creator'      // Kartı yaratan kişi

// Katılım isteğinin durumuna göre Türkçe mesaj
export function getJoinStatusMessage(status: MyJoinStatus): {
  label: string
  color: string
  emoji: string
} {
  const map: Record<MyJoinStatus, { label: string; color: string; emoji: string }> = {
    not_joined: { label: 'Katılmak istiyorum',  color: '#1A8F7E', emoji: '✋' },
    pending:    { label: 'İstek gönderildi',    color: '#F39C12', emoji: '⏳' },
    accepted:   { label: 'Katılımcısın!',       color: '#27AE60', emoji: '✅' },
    declined:   { label: 'İstek reddedildi',    color: '#E74C3C', emoji: '❌' },
    cancelled:  { label: 'İsteği iptal ettin',  color: '#9CA3AF', emoji: '↩️' },
    creator:    { label: 'Senin etkinliğin',    color: '#1A8F7E', emoji: '⭐' },
  }
  return map[status]
}

// Güvenlik ping için kalan süre (dakika)
export function minutesSinceLastPing(pingAt: string | null): number | null {
  if (!pingAt) return null
  return Math.floor((Date.now() - new Date(pingAt).getTime()) / 60_000)
}

// Güvenlik ping uyarı seviyesi
export type PingAlertLevel = 'safe' | 'warning' | 'danger'

export function getPingAlertLevel(minutesAgo: number | null): PingAlertLevel {
  if (minutesAgo === null) return 'safe'
  if (minutesAgo < 30) return 'safe'
  if (minutesAgo < 60) return 'warning'
  return 'danger'
}
