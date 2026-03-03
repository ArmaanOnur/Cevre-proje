// packages/shared/src/notifications.ts

export type NotificationType =
  | 'card_join_request'
  | 'card_join_accepted'
  | 'card_join_declined'
  | 'card_reminder'
  | 'skill_swap_match'
  | 'skill_swap_completed'
  | 'neighborhood_welcome'
  | 'safety_ping_reminder'
  | 'system'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  data: Record<string, any> | null
  is_read: boolean
  created_at: string
}

// Bildirim tipi meta bilgileri
export function getNotificationMeta(type: NotificationType): {
  icon: string
  color: string
  actionLabel?: string
} {
  const meta: Record<NotificationType, { icon: string; color: string; actionLabel?: string }> = {
    card_join_request: {
      icon: '✋',
      color: '#3B82F6',
      actionLabel: 'Görüntüle',
    },
    card_join_accepted: {
      icon: '✅',
      color: '#10B981',
      actionLabel: 'Etkinliğe Git',
    },
    card_join_declined: {
      icon: '❌',
      color: '#EF4444',
    },
    card_reminder: {
      icon: '⏰',
      color: '#F59E0B',
      actionLabel: 'Etkinliğe Git',
    },
    skill_swap_match: {
      icon: '🤝',
      color: '#8B5CF6',
      actionLabel: 'Eşleşmeyi Gör',
    },
    skill_swap_completed: {
      icon: '🎉',
      color: '#10B981',
    },
    neighborhood_welcome: {
      icon: '🏘️',
      color: '#1A8F7E',
      actionLabel: 'Mahalleyi Keşfet',
    },
    safety_ping_reminder: {
      icon: '🛡️',
      color: '#F59E0B',
      actionLabel: 'Ping Gönder',
    },
    system: {
      icon: '📢',
      color: '#6B7280',
    },
  }
  
  return meta[type]
}

// Bildirimden navigasyon URL'i çıkar
export function getNotificationLink(notification: Notification): string | null {
  const { type, data } = notification
  
  if (!data) return null
  
  switch (type) {
    case 'card_join_request':
    case 'card_join_accepted':
    case 'card_join_declined':
    case 'card_reminder':
      return data.card_id ? `/kartlar/${data.card_id}` : null
    
    case 'skill_swap_match':
    case 'skill_swap_completed':
      return data.swap_id ? `/beceriler/${data.swap_id}` : null
    
    case 'neighborhood_welcome':
      return data.neighborhood_id ? `/mahalleler/${data.neighborhood_id}` : '/mahalleler'
    
    case 'safety_ping_reminder':
      return data.card_id ? `/kartlar/${data.card_id}` : null
    
    default:
      return null
  }
}

// Okunmamış sayısını gruplara ayır
export interface NotificationCounts {
  total: number
  cards: number
  skillSwaps: number
  neighborhoods: number
  safety: number
  system: number
}

export function groupNotificationCounts(notifications: Notification[]): NotificationCounts {
  const unread = notifications.filter(n => !n.is_read)
  
  return {
    total: unread.length,
    cards: unread.filter(n => n.type.startsWith('card_')).length,
    skillSwaps: unread.filter(n => n.type.startsWith('skill_swap_')).length,
    neighborhoods: unread.filter(n => n.type === 'neighborhood_welcome').length,
    safety: unread.filter(n => n.type === 'safety_ping_reminder').length,
    system: unread.filter(n => n.type === 'system').length,
  }
}
