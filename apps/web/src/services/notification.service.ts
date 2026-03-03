/**
 * NotificationService — T2 Service Layer
 * Wraps all notification Supabase operations.
 */

import { createClient } from '@/lib/supabase'

export type NotificationCategory = 'cards' | 'skillSwaps' | 'neighborhoods' | 'safety' | 'system'

export interface NotificationCounts {
  total: number
  cards: number
  skillSwaps: number
  neighborhoods: number
  safety: number
  system: number
}

export class NotificationService {
  private static get db() {
    return createClient()
  }

  /** Fetch all notifications for current user */
  static async getAll(userId: string) {
    const { data, error } = await this.db
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)
    return { data, error }
  }

  /** Count unread notifications */
  static async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    if (error) return 0
    return count ?? 0
  }

  /** Mark a single notification as read */
  static async markAsRead(notificationId: string) {
    const { error } = await this.db
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
    return { error }
  }

  /** Mark all notifications as read */
  static async markAllAsRead(userId: string) {
    const { error } = await this.db
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)
    return { error }
  }

  /** Delete a notification */
  static async delete(notificationId: string) {
    const { error } = await this.db
      .from('notifications')
      .delete()
      .eq('id', notificationId)
    return { error }
  }

  /** Request browser push notification permission */
  static async requestBrowserPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied'
    if (Notification.permission === 'default') {
      return await Notification.requestPermission()
    }
    return Notification.permission
  }

  /** Show a browser notification */
  static showBrowserNotification(title: string, body: string, tag?: string) {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    new Notification(title, { body, icon: '/icon-192.png', tag })
  }

  /** Compute counts by category from a notifications array */
  static computeCounts(notifications: { type: string; is_read: boolean }[]): NotificationCounts {
    return notifications.reduce<NotificationCounts>(
      (acc, n) => {
        acc.total++
        if (n.type.startsWith('card_')) acc.cards++
        else if (n.type.startsWith('skill_swap_')) acc.skillSwaps++
        else if (n.type === 'neighborhood_welcome') acc.neighborhoods++
        else if (n.type === 'safety_ping_reminder') acc.safety++
        else acc.system++
        return acc
      },
      { total: 0, cards: 0, skillSwaps: 0, neighborhoods: 0, safety: 0, system: 0 }
    )
  }

  /** Subscribe to realtime notification inserts */
  static subscribe(
    userId: string,
    onInsert: (notification: Record<string, unknown>) => void
  ) {
    return this.db
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        onInsert(payload.new as Record<string, unknown>)
      })
      .subscribe()
  }
}
