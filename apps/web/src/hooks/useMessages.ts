'use client'

/**
 * useMessages — T2 Refactor
 * Reads: useSWR + MessagingService
 * Writes: MessagingService with optimistic mutate
 */

import { useEffect, useCallback, useRef } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/hooks/useAuth'
import { MessagingService } from '@/services/messaging.service'
import { queryKeys } from '@/lib/query-keys'
import type { Message } from '@cevre/shared'

export function useMessages(conversationId: string) {
  const { user } = useAuth()
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // ── SWR read: messages ──────────────────────────────────────────────────
  const { data: messages = [], isLoading, mutate } = useSWR<Message[]>(
    user ? queryKeys.messages(conversationId) : null,
    () => MessagingService.getMessages(conversationId)
      .then(r => (r.data ?? []) as Message[]),
    { revalidateOnFocus: false }
  )

  // ── Realtime: new messages ──────────────────────────────────────────────
  useEffect(() => {
    const channel = MessagingService.subscribeToMessages(conversationId, (newMsg) => {
      mutate(prev => [...(prev ?? []), newMsg as Message], { revalidate: false })
    })
    return () => { channel.unsubscribe() }
  }, [conversationId, mutate])

  // ── Mark all read on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (user && conversationId) {
      MessagingService.markAllAsRead(conversationId)
    }
  }, [user, conversationId])

  // ── Write: send message (optimistic) ────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!user) return

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      content: text,
      type: 'text',
      sent_at: new Date().toISOString(),
    } as any

    mutate(prev => [...(prev ?? []), optimistic], { revalidate: false })

    try {
      await MessagingService.sendMessage({ conversationId, content: text })
      await MessagingService.setTyping(conversationId, false)
    } catch {
      mutate() // rollback on error
    }
  }, [user, conversationId, mutate])

  // ── Write: typing indicator ──────────────────────────────────────────────
  const setTyping = useCallback(() => {
    if (!user) return
    MessagingService.setTyping(conversationId, true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      MessagingService.setTyping(conversationId, false)
    }, 3_000)
  }, [user, conversationId])

  // ── Write: mark as read ──────────────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    if (!user) return
    await MessagingService.markAllAsRead(conversationId)
  }, [user, conversationId])

  return {
    messages,
    isLoading,
    isSending: false,
    sendMessage,
    setTyping,
    markAllAsRead,
    refresh: () => mutate(),
  }
}

export function useMessages(conversationId: string) {
  const supabase = createClient()
  const { user } = useAuth()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await messagingQueries.getMessages(supabase, conversationId)
      setMessages(((data ?? []) as Message[]).reverse())
    } finally {
      setIsLoading(false)
    }
  }, [supabase, conversationId])

  useEffect(() => { load() }, [load])

  // Realtime messages
  useEffect(() => {
    const channel = messagingQueries.subscribeToMessages(supabase, conversationId, (payload) => {
      if (payload.eventType === 'INSERT') {
        setMessages(prev => [...prev, payload.new as Message])
      } else if (payload.eventType === 'UPDATE') {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m))
      }
    })
    return () => { supabase.removeChannel(channel) }
  }, [conversationId]) // eslint-disable-line

  // Realtime typing
  useEffect(() => {
    const channel = messagingQueries.subscribeToTyping(supabase, conversationId, () => {
      loadTypingUsers()
    })
    return () => { supabase.removeChannel(channel) }
  }, [conversationId]) // eslint-disable-line

  const loadTypingUsers = async () => {
    const { data } = await messagingQueries.getTypingUsers(supabase, conversationId)
    const userIds = (data ?? []).filter(t => t.user_id !== user?.id).map(t => t.user_id)
    setTypingUsers(userIds)
  }

  const sendMessage = useCallback(async (text: string, attachments?: any[]) => {
    if (!user) return
    setIsSending(true)
    try {
      await messagingQueries.sendMessage(supabase, conversationId, user.id, text, attachments)
      await messagingQueries.clearTyping(supabase, conversationId, user.id)
    } finally {
      setIsSending(false)
    }
  }, [supabase, conversationId, user])

  const setTyping = useCallback(() => {
    if (!user) return
    messagingQueries.setTyping(supabase, conversationId, user.id)
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      messagingQueries.clearTyping(supabase, conversationId, user.id)
    }, 3000)
  }, [supabase, conversationId, user])

  const markAllAsRead = useCallback(async () => {
    if (!user) return
    await messagingQueries.markAllAsRead(supabase, conversationId, user.id)
  }, [supabase, conversationId, user])

  return {
    messages,
    isLoading,
    isSending,
    typingUsers,
    sendMessage,
    setTyping,
    markAllAsRead,
  }
}
