'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { cardDetailQueries, safetyDetailQueries } from '@cevre/supabase'
import type { CardDetailData, SafetyLog, MyJoinStatus } from '@cevre/shared'

export function useCardDetail(cardId: string) {
  const supabase = createClient()
  const { user } = useAuth()

  const [card, setCard] = useState<CardDetailData | null>(null)
  const [safetyLog, setSafetyLog] = useState<SafetyLog | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [isPinging, setIsPinging] = useState(false)

  // ─── Kart yükle ─────────────────────────────────────────────────────────────
  const loadCard = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await cardDetailQueries.getById(supabase, cardId)
      if (error) throw error
      setCard(data as unknown as CardDetailData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kart yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, cardId])

  // ─── Güvenlik log'u yükle ───────────────────────────────────────────────────
  const loadSafetyLog = useCallback(async () => {
    if (!user) return
    const { data } = await safetyDetailQueries.getActiveLog(supabase, user.id, cardId)
    setSafetyLog(data as SafetyLog | null)
  }, [supabase, user, cardId])

  // ─── İlk yükleme ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadCard()
    loadSafetyLog()
  }, [cardId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Realtime abonelik ──────────────────────────────────────────────────────
  useEffect(() => {
    const channel = cardDetailQueries.subscribeToCard(
      supabase,
      cardId,
      // Kart değişikliği
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          setCard(prev => prev ? { ...prev, ...payload.new } : prev)
        }
      },
      // Katılım değişikliği → kartı tamamen yenile (join listesi güncellenir)
      () => { loadCard() }
    )
    return () => { supabase.removeChannel(channel) }
  }, [cardId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Benim katılım durumum ──────────────────────────────────────────────────
  const myJoinStatus = useCallback((): MyJoinStatus => {
    if (!user || !card) return 'not_joined'
    if (card.creator_id === user.id) return 'creator'
    const myJoin = card.joins?.find(j => j.user_id === user.id)
    if (!myJoin) return 'not_joined'
    return myJoin.status as MyJoinStatus
  }, [user, card])

  const myJoin = user ? card?.joins?.find(j => j.user_id === user.id) : null

  // ─── Katılım isteği gönder ──────────────────────────────────────────────────
  const requestJoin = useCallback(async (message?: string) => {
    if (!user || !card) return
    setIsJoining(true)
    try {
      await cardDetailQueries.requestJoin(supabase, cardId, user.id, message)
      await loadCard()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'İstek gönderilemedi')
    } finally {
      setIsJoining(false)
    }
  }, [supabase, user, card, cardId, loadCard])

  // ─── Katılım isteği iptal ───────────────────────────────────────────────────
  const cancelJoin = useCallback(async () => {
    if (!myJoin) return
    setIsJoining(true)
    try {
      await cardDetailQueries.cancelJoin(supabase, myJoin.id)
      await loadCard()
    } finally {
      setIsJoining(false)
    }
  }, [supabase, myJoin, loadCard])

  // ─── Katılım isteği kabul/red (kart sahibi) ─────────────────────────────────
  const respondToJoin = useCallback(async (joinId: string, accept: boolean) => {
    try {
      if (accept) await cardDetailQueries.acceptJoin(supabase, joinId)
      else await cardDetailQueries.declineJoin(supabase, joinId)
      await loadCard()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Yanıt gönderilemedi')
    }
  }, [supabase, loadCard])

  // ─── Kartı iptal et ─────────────────────────────────────────────────────────
  const cancelCard = useCallback(async () => {
    if (!card) return
    await cardDetailQueries.cancelCard(supabase, cardId)
    setCard(prev => prev ? { ...prev, status: 'cancelled' } : prev)
  }, [supabase, card, cardId])

  // ─── Güvenlik ping başlat ───────────────────────────────────────────────────
  const startSafetyLog = useCallback(async (emergencyContactId?: string) => {
    if (!user) return
    const { data } = await safetyDetailQueries.startLog(
      supabase, user.id, cardId, emergencyContactId
    )
    setSafetyLog(data as SafetyLog)
  }, [supabase, user, cardId])

  // ─── "Güvendeyim" ping gönder ───────────────────────────────────────────────
  const sendSafePing = useCallback(async () => {
    if (!safetyLog) return
    setIsPinging(true)
    try {
      const { data } = await safetyDetailQueries.sendPing(supabase, safetyLog.id)
      setSafetyLog(data as SafetyLog)
    } finally {
      setIsPinging(false)
    }
  }, [supabase, safetyLog])

  return {
    card,
    isLoading,
    error,
    isJoining,
    isPinging,
    safetyLog,
    myJoinStatus: myJoinStatus(),
    myJoin,
    isCreator: card?.creator_id === user?.id,
    // Actions
    requestJoin,
    cancelJoin,
    respondToJoin,
    cancelCard,
    startSafetyLog,
    sendSafePing,
    refresh: loadCard,
  }
}
