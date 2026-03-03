'use client'

import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useCardStore } from '@/store/cards.store'
import { useAuthStore } from '@/store/auth.store'
import { cardQueries } from '@cevre/supabase'
import type { InsertDto } from '@cevre/supabase'
import { makeCardExpiry } from '@cevre/shared'
import type { CardFormData } from '@cevre/shared'

export function useCards() {
  const supabase = createClient()
  const { supabaseUser } = useAuthStore()
  const {
    cards, selectedCard, activeCategory, userLat, userLng,
    isLoading, error,
    setCards, addCard, updateCard, selectCard, setCategory,
    setUserLocation, setLoading, setError,
  } = useCardStore()

  // Kullanıcı konumunu al
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation(pos.coords.latitude, pos.coords.longitude),
      () => {
        // İzin verilmezse İstanbul merkezi
        setUserLocation(41.0082, 28.9784)
      }
    )
  }, [setUserLocation])

  // Yakın kartları yükle
  const loadNearbyCards = useCallback(async () => {
    if (!userLat || !userLng) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await cardQueries.getNearby(supabase, userLat, userLng)
      if (error) throw error
      setCards((data as any) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kartlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [supabase, userLat, userLng, setCards, setLoading, setError])

  // Konum hazır olduğunda kartları yükle
  useEffect(() => {
    if (userLat && userLng) loadNearbyCards()
  }, [userLat, userLng]) // eslint-disable-line react-hooks/exhaustive-deps

  // Gerçek zamanlı güncellemeler
  useEffect(() => {
    const channel = cardQueries.subscribeToNearby(
      supabase,
      (newCard) => addCard(newCard as any),
      (updatedCard) => updateCard(updatedCard as any)
    )
    return () => { supabase.removeChannel(channel) }
  }, [supabase, addCard, updateCard])

  // Yeni kart oluştur
  const createCard = useCallback(async (formData: CardFormData) => {
    if (!supabaseUser) throw new Error('Giriş yapmanız gerekiyor')
    if (!userLat || !userLng) throw new Error('Konumunuz alınamadı')

    const insertData: InsertDto<'activity_cards'> = {
      creator_id: supabaseUser.id,
      category: formData.category as any,
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      location_point: `POINT(${formData.lng} ${formData.lat})` as any,
      location_name: formData.location_name.trim(),
      max_participants: formData.max_participants,
      expires_at: makeCardExpiry(formData.duration_hours),
    }

    const { data, error } = await cardQueries.create(supabase, insertData)
    if (error) throw new Error(error.message)
    if (data) addCard(data)
    return data
  }, [supabase, supabaseUser, userLat, userLng, addCard])

  // Katılım isteği
  const requestJoin = useCallback(async (cardId: string, message?: string) => {
    if (!supabaseUser) throw new Error('Giriş yapmanız gerekiyor')
    const { data, error } = await cardQueries.requestJoin(supabase, cardId, supabaseUser.id, message)
    if (error) throw new Error(error.message)
    return data
  }, [supabase, supabaseUser])

  // Filtrelenmiş kartlar
  const filteredCards = activeCategory
    ? cards.filter((c) => c.category === activeCategory)
    : cards

  return {
    cards: filteredCards,
    allCards: cards,
    selectedCard,
    activeCategory,
    userLat,
    userLng,
    isLoading,
    error,
    selectCard,
    setCategory,
    createCard,
    requestJoin,
    loadNearbyCards,
  }
}
