// packages/supabase/src/messaging-queries.ts
import type { TypedSupabaseClient } from './client'
import type { ConversationType } from '@cevre/shared'

export const messagingQueries = {
  // ─── KONUŞMALAR ───────────────────────────────────────────────────────────
  
  /** Kullanıcının tüm konuşmalarını getir (conversation_participants join table üzerinden) */
  getConversations: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        role,
        is_muted,
        is_pinned,
        last_read_at,
        joined_at,
        conversation:conversations!conversation_id(
          id, type, name, avatar_url, description,
          created_by, last_message_id, last_message_at, created_at, updated_at
        )
      `)
      .eq('user_id', userId)
      .is('left_at', null)
      .order('conversation(last_message_at)', { ascending: false, nullsFirst: false }),

  /** Tek konuşma detayı */
  getConversationById: (supabase: TypedSupabaseClient, conversationId: string) =>
    supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single(),

  /** Konuşma oluştur veya bul */
  getOrCreateConversation: async (
    supabase: TypedSupabaseClient,
    type: ConversationType,
    participants: string[],
    cardId?: string,
    skillSwapId?: string
  ) => {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      p_type: type,
      p_participants: participants,
      p_card_id: cardId ?? null,
      p_skill_swap_id: skillSwapId ?? null,
    })
    
    if (error) return { data: null, error }
    
    // Conversation'ı getir
    return supabase
      .from('conversations')
      .select('*')
      .eq('id', data)
      .single()
  },

  /** Okunmamış konuşma sayısı — conversation_participants ve message_reads üzerinden */
  getUnreadConversationCount: async (supabase: TypedSupabaseClient, userId: string) => {
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId)
      .is('left_at', null)
    
    if (!participations) return 0
    
    let unreadCount = 0
    for (const p of participations) {
      // Kullanıcının son okumasından sonra gelen, kendisi tarafından gönderilmeyen mesaj var mı?
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', p.conversation_id)
        .neq('sender_id', userId)
        .is('deleted_at', null)
        .gt('created_at', p.last_read_at ?? '1970-01-01')
      
      if (count && count > 0) unreadCount++
    }
    
    return unreadCount
  },

  // ─── MESAJLAR ─────────────────────────────────────────────────────────────

  /** Konuşmanın mesajlarını getir */
  getMessages: (
    supabase: TypedSupabaseClient,
    conversationId: string,
    limit = 50
  ) =>
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit),

  /** Mesaj gönder (actual schema: content, type, media_url columns) */
  sendMessage: (
    supabase: TypedSupabaseClient,
    conversationId: string,
    senderId: string,
    content?: string,
    mediaUrl?: string,
    mediaType?: string,
    replyToId?: string
  ) =>
    supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        type: mediaUrl ? (mediaType ?? 'image') : 'text',
        content: content ?? null,
        media_url: mediaUrl ?? null,
        media_type: mediaType ?? null,
        reply_to_id: replyToId ?? null,
      })
      .select()
      .single(),

  /** Mesajı okundu işaretle — message_reads join table kullanır */
  markAsRead: async (
    supabase: TypedSupabaseClient,
    messageId: string,
    userId: string
  ) =>
    supabase
      .from('message_reads')
      .upsert({ message_id: messageId, user_id: userId, read_at: new Date().toISOString() },
        { onConflict: 'message_id,user_id' }
      )
      .select()
      .single(),

  /** Tüm mesajları okundu işaretle — message_reads table upsert */
  markAllAsRead: async (
    supabase: TypedSupabaseClient,
    conversationId: string,
    userId: string
  ) => {
    const { data: messages } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('deleted_at', null)
    
    if (!messages || messages.length === 0) return
    
    const now = new Date().toISOString()
    const reads = messages.map((m) => ({
      message_id: m.id,
      user_id: userId,
      read_at: now,
    }))
    
    return supabase
      .from('message_reads')
      .upsert(reads, { onConflict: 'message_id,user_id' })
  },

  /** Mesajı düzenle (content column) */
  editMessage: (
    supabase: TypedSupabaseClient,
    messageId: string,
    newContent: string
  ) =>
    supabase
      .from('messages')
      .update({
        content: newContent,
      })
      .eq('id', messageId)
      .select()
      .single(),

  /** Mesajı sil (soft delete) */
  deleteMessage: (supabase: TypedSupabaseClient, messageId: string) =>
    supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId),

  // ─── TYPING INDICATORS ────────────────────────────────────────────────────

  /** Typing indicator güncelle */
  setTyping: (
    supabase: TypedSupabaseClient,
    conversationId: string,
    userId: string
  ) =>
    supabase
      .from('typing_indicators')
      .upsert({
        conversation_id: conversationId,
        user_id: userId,
        last_typed_at: new Date().toISOString(),
      }, {
        onConflict: 'conversation_id,user_id',
      }),

  /** Typing indicator'ları getir */
  getTypingUsers: (supabase: TypedSupabaseClient, conversationId: string) =>
    supabase
      .from('typing_indicators')
      .select('user_id, last_typed_at')
      .eq('conversation_id', conversationId)
      .gte('last_typed_at', new Date(Date.now() - 10000).toISOString()), // Son 10 saniye

  /** Typing indicator'ı sil */
  clearTyping: (
    supabase: TypedSupabaseClient,
    conversationId: string,
    userId: string
  ) =>
    supabase
      .from('typing_indicators')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId),

  // ─── REALTIME ─────────────────────────────────────────────────────────────

  /** Konuşma değişikliklerini dinle — conversation_participants table üzerinden */
  subscribeToConversations: (
    supabase: TypedSupabaseClient,
    userId: string,
    onConversationChange: (payload: any) => void
  ) =>
    supabase
      .channel(`user_conversations_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${userId}`,
      }, onConversationChange)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
      }, onConversationChange)
      .subscribe(),

  /** Mesaj değişikliklerini dinle */
  subscribeToMessages: (
    supabase: TypedSupabaseClient,
    conversationId: string,
    onMessageChange: (payload: any) => void
  ) =>
    supabase
      .channel(`conversation_messages_${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, onMessageChange)
      .subscribe(),

  /** Typing indicator değişikliklerini dinle */
  subscribeToTyping: (
    supabase: TypedSupabaseClient,
    conversationId: string,
    onTypingChange: (payload: any) => void
  ) =>
    supabase
      .channel(`conversation_typing_${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `conversation_id=eq.${conversationId}`,
      }, onTypingChange)
      .subscribe(),
}
