'use client'

/**
 * useConversations — T2 Refactor
 * Reads: useSWR + MessagingService
 * Realtime: Supabase channel → mutate()
 */

import { useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { MessagingService } from '@/services/messaging.service'
import { queryKeys } from '@/lib/query-keys'
import type { Conversation } from '@cevre/shared'

export function useConversations() {
  const supabase = createClient()
  const { user } = useAuth()

  // ── SWR read: conversations list ────────────────────────────────────────
  const { data: conversations = [], isLoading, mutate } = useSWR<Conversation[]>(
    user ? queryKeys.conversations(user.id) : null,
    () => MessagingService.getConversations()
      .then(r => (r.data ?? []) as Conversation[]),
    { revalidateOnFocus: false }
  )

  // ── SWR read: unread count ──────────────────────────────────────────────
  const { data: unreadCount = 0, mutate: mutateUnread } = useSWR(
    user ? queryKeys.unreadCount(user.id) : null,
    () => MessagingService.getUnreadCount().then(r => r.count),
    { refreshInterval: 30_000 }
  )

  // ── Realtime: conversation_participants changes ──────────────────────────
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`conv-participants-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        mutate()
        mutateUnread()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, mutate, mutateUnread]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    conversations,
    unreadCount,
    isLoading,
    refresh: () => { mutate(); mutateUnread() },
  }
}
