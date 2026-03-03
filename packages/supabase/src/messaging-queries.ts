// packages/supabase/src/messaging-queries.ts
import type { TypedSupabaseClient } from './client'
import type { ConversationType } from '@cevre/shared'

export const messagingQueries = {
  // ─── KONUŞMALAR ───────────────────────────────────────────────────────────
  
  /** Kullanıcının tüm konuşmalarını getir */
  getConversations: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('conversations')
      .select('*')
      .contains('participants', [userId])
      .order('last_message_at', { ascending: false, nullsFirst: false }),

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

  /** Okunmamış konuşma sayısı */
  getUnreadConversationCount: async (supabase: TypedSupabaseClient, userId: string) => {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .contains('participants', [userId])
    
    if (!conversations) return 0
    
    let unreadCount = 0
    for (const conv of conversations) {
      const { data: count } = await supabase.rpc('get_unread_count', {
        p_user_id: userId,
        p_conversation_id: conv.id,
      })
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

  /** Mesaj gönder */
  sendMessage: (
    supabase: TypedSupabaseClient,
    conversationId: string,
    senderId: string,
    text?: string,
    attachments?: any[]
  ) =>
    supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        text: text ?? null,
        attachments: attachments ? JSON.stringify(attachments) : null,
      })
      .select()
      .single(),

  /** Mesajı okundu işaretle */
  markAsRead: async (
    supabase: TypedSupabaseClient,
    messageId: string,
    userId: string
  ) => {
    const { data: message } = await supabase
      .from('messages')
      .select('read_by')
      .eq('id', messageId)
      .single()
    
    if (!message) return { data: null, error: new Error('Message not found') }
    
    const readBy = message.read_by || {}
    readBy[userId] = new Date().toISOString()
    
    return supabase
      .from('messages')
      .update({ read_by: readBy })
      .eq('id', messageId)
      .select()
      .single()
  },

  /** Tüm mesajları okundu işaretle */
  markAllAsRead: async (
    supabase: TypedSupabaseClient,
    conversationId: string,
    userId: string
  ) => {
    const { data: messages } = await supabase
      .from('messages')
      .select('id, read_by')
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('deleted_at', null)
    
    if (!messages) return
    
    for (const msg of messages) {
      if (!msg.read_by?.[userId]) {
        const readBy = msg.read_by || {}
        readBy[userId] = new Date().toISOString()
        
        await supabase
          .from('messages')
          .update({ read_by: readBy })
          .eq('id', msg.id)
      }
    }
  },

  /** Mesajı düzenle */
  editMessage: (
    supabase: TypedSupabaseClient,
    messageId: string,
    newText: string
  ) =>
    supabase
      .from('messages')
      .update({
        text: newText,
        edited_at: new Date().toISOString(),
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

  /** Konuşma değişikliklerini dinle */
  subscribeToConversations: (
    supabase: TypedSupabaseClient,
    userId: string,
    onConversationChange: (payload: any) => void
  ) =>
    supabase
      .channel(`user_conversations_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `participants.cs.{${userId}}`,
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
