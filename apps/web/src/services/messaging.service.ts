/**
 * MessagingService — T1 Service Layer
 * Wraps all messaging Supabase operations.
 * Uses corrected schema (conversation_participants join table,
 * message_reads table, content/type columns) — DEBT-002 fix propagated.
 */

import { createClient } from '@/lib/supabase'
import { eventBus, makeEvent } from '@/lib/event-bus'

export class MessagingService {
  private static get db() {
    return createClient()
  }

  /** Get all conversations for the current user */
  static async getConversations() {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    const { data, error } = await db
      .from('conversation_participants')
      .select(`
        conversation_id,
        role,
        last_read_at,
        joined_at,
        conversation:conversations!conversation_id(
          id,
          name,
          type,
          avatar_url,
          last_message_at,
          created_at,
          messages(
            content,
            sender_id,
            sent_at,
            type
          )
        )
      `)
      .eq('user_id', user.id)
      .is('left_at', null)
      .order('joined_at', { ascending: false })

    return { data, error }
  }

  /** Create a new direct message conversation */
  static async createDirectConversation(otherUserId: string) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    // Check if DM already exists between these two users
    const { data: existing } = await db
      .from('conversations')
      .select(`
        id,
        conversation_participants!inner(user_id)
      `)
      .eq('type', 'direct')
      .contains('conversation_participants.user_id', [user.id, otherUserId])
      .maybeSingle()

    if (existing) return { data: existing, error: null }

    // Create new conversation
    const { data: conversation, error: convError } = await db
      .from('conversations')
      .insert({ type: 'direct', created_by: user.id })
      .select()
      .single()

    if (convError || !conversation) return { data: null, error: convError }

    // Add both participants
    const { error: participantError } = await db
      .from('conversation_participants')
      .insert([
        { conversation_id: conversation.id, user_id: user.id, role: 'member' },
        { conversation_id: conversation.id, user_id: otherUserId, role: 'member' },
      ])

    if (participantError) return { data: null, error: participantError }
    return { data: conversation, error: null }
  }

  /** Get messages in a conversation */
  static async getMessages(conversationId: string, limit = 50, before?: string) {
    let query = this.db
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        type,
        media_url,
        media_type,
        reply_to_id,
        sent_at,
        edited_at,
        deleted_at,
        profiles!sender_id(id, username, avatar_url),
        message_reads(user_id, read_at)
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('sent_at', before)
    }

    const { data, error } = await query
    return { data: data?.reverse() ?? null, error }
  }

  /** Send a message */
  static async sendMessage(payload: {
    conversationId: string
    content: string
    type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'activity_card' | 'story' | 'contact'
    mediaUrl?: string
    mediaType?: string
    replyToId?: string
  }) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    const { data, error } = await db
      .from('messages')
      .insert({
        conversation_id: payload.conversationId,
        sender_id: user.id,
        content: payload.content,
        type: payload.type ?? 'text',
        media_url: payload.mediaUrl ?? null,
        media_type: payload.mediaType ?? null,
        reply_to_id: payload.replyToId ?? null,
      })
      .select()
      .single()
    if (!error && data) {
      eventBus.emit(makeEvent('MESSAGE_SENT', {
        messageId: data.id,
        conversationId: payload.conversationId,
        senderId: user.id,
        messageType: (['image', 'file', 'voice'].includes(payload.type ?? '') ? payload.type : 'text') as 'text' | 'image' | 'file' | 'voice',
      }))
    }
    return { data, error }
  }

  /** Mark a specific message as read */
  static async markAsRead(messageId: string) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }

    const { error } = await db
      .from('message_reads')
      .upsert({ message_id: messageId, user_id: user.id, read_at: new Date().toISOString() })
    return { error }
  }

  /** Mark all unread messages in a conversation as read */
  static async markAllAsRead(conversationId: string) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }

    // Update last_read_at on the participant record
    const { error } = await db
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
    return { error }
  }

  /** Real-time subscription to new messages in a conversation */
  static subscribeToMessages(
    conversationId: string,
    onMessage: (message: unknown) => void
  ) {
    return this.db
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        onMessage(payload.new)
      })
      .subscribe()
  }

  /** Set typing indicator */
  static async setTyping(conversationId: string, isTyping: boolean) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return

    if (isTyping) {
      await db.from('typing_indicators').upsert({
        conversation_id: conversationId,
        user_id: user.id,
        started_at: new Date().toISOString(),
      })
    } else {
      await db.from('typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
    }
  }

  /** Get unread conversation count */
  static async getUnreadCount() {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { count: 0, error: null }

    const { data, error } = await db
      .from('conversation_participants')
      .select(`
        conversation_id,
        last_read_at,
        conversation:conversations!conversation_id(
          messages(sent_at)
        )
      `)
      .eq('user_id', user.id)
      .is('left_at', null)

    if (error || !data) return { count: 0, error }

    // Count conversations with messages newer than last_read_at
    const unread = data.filter((p) => {
      const conv = p.conversation as { messages: { sent_at: string }[] } | null
      if (!conv?.messages?.length) return false
      const lastMsg = conv.messages.at(-1)
      if (!lastMsg) return false
      return !p.last_read_at || lastMsg.sent_at > p.last_read_at
    })

    return { count: unread.length, error: null }
  }
}
