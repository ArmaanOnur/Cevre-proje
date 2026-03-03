'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { messagingQueries } from '@cevre/supabase'
import type { Message } from '@cevre/shared'

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
