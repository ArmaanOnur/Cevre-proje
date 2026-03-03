'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { messagingQueries } from '@cevre/supabase'
import type { Conversation } from '@cevre/shared'

export function useConversations() {
  const supabase = createClient()
  const { user } = useAuth()
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const { data } = await messagingQueries.getConversations(supabase, user.id)
      setConversations((data ?? []) as Conversation[])
      
      const count = await messagingQueries.getUnreadConversationCount(supabase, user.id)
      setUnreadCount(count)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, user])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    if (!user) return
    const channel = messagingQueries.subscribeToConversations(supabase, user.id, () => load())
    return () => { supabase.removeChannel(channel) }
  }, [user]) // eslint-disable-line

  return { conversations, unreadCount, isLoading, refresh: load }
}
