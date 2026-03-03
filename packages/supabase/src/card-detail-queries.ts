// packages/supabase/src/card-detail-queries.ts
import type { TypedSupabaseClient } from './client'

// ─── Kart detay (creator + joins dahil) ─────────────────────────────────────
export const cardDetailQueries = {

  getById: (supabase: TypedSupabaseClient, cardId: string) =>
    supabase
      .from('activity_cards')
      .select(`
        *,
        creator:users!creator_id(
          id, display_name, avatar_url, verified_at
        ),
        card_joins(
          id, user_id, status, message, joined_at, responded_at,
          user:users!user_id(
            id, display_name, avatar_url, verified_at
          )
        )
      `)
      .eq('id', cardId)
      .single(),

  // Kullanıcının bu karttaki katılım durumu
  getMyJoin: (supabase: TypedSupabaseClient, cardId: string, userId: string) =>
    supabase
      .from('card_joins')
      .select('*')
      .eq('card_id', cardId)
      .eq('user_id', userId)
      .maybeSingle(),

  // Katılım isteği gönder
  requestJoin: (
    supabase: TypedSupabaseClient,
    cardId: string,
    userId: string,
    message?: string
  ) =>
    supabase
      .from('card_joins')
      .insert({ card_id: cardId, user_id: userId, message: message ?? null })
      .select()
      .single(),

  // Katılım isteğini iptal et (kullanıcı tarafından)
  cancelJoin: (supabase: TypedSupabaseClient, joinId: string) =>
    supabase
      .from('card_joins')
      .update({ status: 'cancelled' })
      .eq('id', joinId)
      .select()
      .single(),

  // Katılım isteğini kabul et (kart sahibi tarafından)
  acceptJoin: (supabase: TypedSupabaseClient, joinId: string) =>
    supabase
      .from('card_joins')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', joinId)
      .select()
      .single(),

  // Katılım isteğini reddet (kart sahibi tarafından)
  declineJoin: (supabase: TypedSupabaseClient, joinId: string) =>
    supabase
      .from('card_joins')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', joinId)
      .select()
      .single(),

  // Kartı iptal et (sadece kart sahibi)
  cancelCard: (supabase: TypedSupabaseClient, cardId: string) =>
    supabase
      .from('activity_cards')
      .update({ status: 'cancelled' })
      .eq('id', cardId),

  // Realtime kart değişikliklerini dinle
  subscribeToCard: (
    supabase: TypedSupabaseClient,
    cardId: string,
    onCardChange: (payload: any) => void,
    onJoinChange: (payload: any) => void
  ) =>
    supabase
      .channel(`card_${cardId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'activity_cards',
        filter: `id=eq.${cardId}`,
      }, onCardChange)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'card_joins',
        filter: `card_id=eq.${cardId}`,
      }, onJoinChange)
      .subscribe(),
}

// ─── Güvenlik sorguları ─────────────────────────────────────────────────────
export const safetyDetailQueries = {

  // Güvenlik kaydı başlat
  startLog: (
    supabase: TypedSupabaseClient,
    userId: string,
    cardId: string,
    emergencyContactId?: string
  ) =>
    supabase
      .from('safety_logs')
      .insert({
        user_id: userId,
        card_id: cardId,
        emergency_contact_id: emergencyContactId ?? null,
      })
      .select()
      .single(),

  // Mevcut aktif log'u getir
  getActiveLog: (supabase: TypedSupabaseClient, userId: string, cardId: string) =>
    supabase
      .from('safety_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('card_id', cardId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

  // "Güvendeyim" ping gönder
  sendPing: (supabase: TypedSupabaseClient, logId: string) =>
    supabase
      .from('safety_logs')
      .update({ safe_ping_at: new Date().toISOString() })
      .eq('id', logId)
      .select()
      .single(),
}
