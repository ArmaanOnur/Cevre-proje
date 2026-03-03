// packages/supabase/src/notification-queries.ts
import type { TypedSupabaseClient } from './client'
import type { NotificationType } from '@cevre/shared'

export const notificationQueries = {
  // ─── LİSTE ────────────────────────────────────────────────────────────────
  
  /** Kullanıcının tüm bildirimlerini getir */
  getAll: (supabase: TypedSupabaseClient, userId: string, limit = 50) =>
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),

  /** Okunmamış bildirimleri getir */
  getUnread: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false }),

  /** Okunmamış bildirim sayısı */
  getUnreadCount: async (supabase: TypedSupabaseClient, userId: string): Promise<number> => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    
    return count ?? 0
  },

  // ─── İŞLEMLER ─────────────────────────────────────────────────────────────

  /** Bildirimi okundu olarak işaretle */
  markAsRead: (supabase: TypedSupabaseClient, notificationId: string) =>
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single(),

  /** Tüm bildirimleri okundu işaretle */
  markAllAsRead: async (supabase: TypedSupabaseClient, userId: string) => {
    const { data, error } = await supabase.rpc('mark_all_notifications_read', {
      p_user_id: userId,
    })
    return { data, error }
  },

  /** Bildirimi sil */
  delete: (supabase: TypedSupabaseClient, notificationId: string) =>
    supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId),

  /** Manuel bildirim oluştur (sistem yöneticisi için) */
  create: async (
    supabase: TypedSupabaseClient,
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>
  ) => {
    const { data: result, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_body: body,
      p_data: data ? JSON.stringify(data) : null,
    })
    return { data: result, error }
  },

  // ─── REALTIME ────────────────────────────────────────────────────────────

  /** Yeni bildirimleri dinle */
  subscribe: (
    supabase: TypedSupabaseClient,
    userId: string,
    onNotification: (payload: any) => void
  ) =>
    supabase
      .channel(`notifications_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, onNotification)
      .subscribe(),
}

// ─── PUSH TOKEN YÖNETİMİ ──────────────────────────────────────────────────

export const pushTokenQueries = {
  /** Push token kaydet veya güncelle */
  upsert: (
    supabase: TypedSupabaseClient,
    userId: string,
    token: string,
    deviceType: 'ios' | 'android' | 'web'
  ) =>
    supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token,
        device_type: deviceType,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,token',
      })
      .select()
      .single(),

  /** Kullanıcının aktif tokenlarını getir */
  getActive: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('push_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true),

  /** Token'ı devre dışı bırak */
  deactivate: (supabase: TypedSupabaseClient, token: string) =>
    supabase
      .from('push_tokens')
      .update({ is_active: false })
      .eq('token', token),

  /** Kullanıcının tüm tokenlarını sil (çıkış yapınca) */
  deleteAll: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId),
}
