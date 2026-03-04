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
