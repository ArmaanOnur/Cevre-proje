'use client'

/**
 * useCards — T2 Refactor
 * Reads: useSWR + CardService (replaces manual useState+useEffect)
 * Writes: CardService methods with SWR cache mutation
 */

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { useCardStore } from '@/store/cards.store'
import { useAuthStore } from '@/store/auth.store'
import { CardService } from '@/services/card.service'
import { commandBus } from '@/cqrs'
import { useGeolocation } from '@/hooks/useGeolocation'
import { queryKeys } from '@/lib/query-keys'
import { makeCardExpiry } from '@cevre/shared'
import type { CardFormData } from '@cevre/shared'

export function useCards() {
  const { supabaseUser } = useAuthStore()
  const {
    selectedCard, activeCategory,
    userLat, userLng,
    selectCard, setCategory, setUserLocation,
    addCard, setCards,
  } = useCardStore()

  // Geolocation — extracted hook (T4)
  const { lat, lng } = useGeolocation()
  useEffect(() => {
    if (lat !== null && lng !== null) setUserLocation(lat, lng)
  }, [lat, lng, setUserLocation])

  // ── SWR read: nearby cards ──────────────────────────────────────────────
  const swrKey = userLat && userLng
    ? queryKeys.nearbyCards(userLat, userLng, activeCategory ?? undefined)
    : null

  const { data: cards = [], isLoading, error: swrError, mutate } = useSWR(
    swrKey,
    () => CardService.getCards({ lat: userLat!, lng: userLng!, category: activeCategory ?? undefined })
      .then(r => { if (r.error) throw r.error; return (r.data ?? []) as any[] }),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  )

  // Sync SWR data into Zustand store (for map/other consumers)
  useEffect(() => {
    if (cards.length) setCards(cards)
  }, [cards, setCards])

  // ── Realtime: new cards ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = CardService.subscribeToNewCards((newCard) => {
      addCard(newCard as any)
      mutate()
    })
    return () => { channel.unsubscribe() }
  }, [addCard, mutate])

  // ── Write: create card ──────────────────────────────────────────────────
  const createCard = useCallback(async (formData: CardFormData) => {
    if (!supabaseUser) throw new Error('Giriş yapmanız gerekiyor')
    if (!userLat || !userLng) throw new Error('Konumunuz alınamadı')

    const { data, error } = await commandBus.dispatch({
      type: 'CREATE_CARD',
      payload: {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        category: formData.category,
        location: { lat: formData.lat, lng: formData.lng, address: formData.location_name },
        max_participants: formData.max_participants,
        scheduled_at: makeCardExpiry(formData.duration_hours),
      },
    })
    if (error) throw new Error((error as any).message)
    mutate()
    return data
  }, [supabaseUser, userLat, userLng, mutate])

  // ── Write: request join (optimistic) ────────────────────────────────────
  const requestJoin = useCallback(async (cardId: string) => {
    if (!supabaseUser) throw new Error('Giriş yapmanız gerekiyor')
    mutate(
      cards.map(c => c.id === cardId
        ? { ...c, participants_count: (c.participants_count ?? 0) + 1 }
        : c),
      { revalidate: false }
    )
    const { error } = await commandBus.dispatch({ type: 'JOIN_CARD', payload: { cardId } })
    if (error) { mutate(); throw new Error((error as any).message) }
  }, [supabaseUser, cards, mutate])

  // ── Write: toggle like (optimistic) ─────────────────────────────────────
  const toggleLike = useCallback(async (cardId: string) => {
    if (!supabaseUser) return
    const card = cards.find(c => c.id === cardId)
    const isLiked = card?.is_liked ?? false
    mutate(
      cards.map(c => c.id === cardId
        ? { ...c, is_liked: !isLiked, likes_count: (c.likes_count ?? 0) + (isLiked ? -1 : 1) }
        : c),
      { revalidate: false }
    )
    const { error } = await CardService.toggleLike(cardId)
    if (error) mutate()
  }, [supabaseUser, cards, mutate])

  const filteredCards = activeCategory
    ? cards.filter((c: any) => c.category === activeCategory)
    : cards

  return {
    cards: filteredCards,
    allCards: cards,
    selectedCard,
    activeCategory,
    userLat,
    userLng,
    isLoading,
    error: swrError ? String(swrError) : null,
    selectCard,
    setCategory,
    createCard,
    requestJoin,
    toggleLike,
    loadNearbyCards: () => mutate(),
  }
}

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
