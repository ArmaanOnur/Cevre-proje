'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { cardQueries } from '@cevre/supabase'
import type { ActivityCard } from '@cevre/supabase'
import {
  parsePostGISPoint, haversineDistance, MAP_DEFAULTS,
  type LatLng, clusterPoints,
} from '@cevre/shared'

export interface CardWithCoords extends ActivityCard {
  lat: number
  lng: number
  distanceMeters?: number
}

export interface MapViewState {
  longitude: number
  latitude: number
  zoom: number
}

interface UseMapOptions {
  radiusMeters?: number
  autoLocate?: boolean
}

export function useMap(options: UseMapOptions = {}) {
  const { radiusMeters = 5000, autoLocate = true } = options
  const supabase = createClient()

  // ─── State ──────────────────────────────────────────────────────────────────
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: MAP_DEFAULTS.DEFAULT_LNG,
    latitude: MAP_DEFAULTS.DEFAULT_LAT,
    zoom: MAP_DEFAULTS.DEFAULT_ZOOM,
  })
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  const [cards, setCards] = useState<CardWithCoords[]>([])
  const [selectedCard, setSelectedCard] = useState<CardWithCoords | null>(null)
  const [isLoadingCards, setIsLoadingCards] = useState(false)
  const [cardsError, setCardsError] = useState<string | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ─── Kullanıcı konumunu al ──────────────────────────────────────────────────
  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Tarayıcınız konum özelliğini desteklemiyor')
      return
    }

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setViewState(v => ({ ...v, latitude: loc.lat, longitude: loc.lng, zoom: 14 }))
        setIsLocating(false)
      },
      (err) => {
        const msg = err.code === 1
          ? 'Konum izni verilmedi. Haritada manuel olarak konumunuzu seçebilirsiniz.'
          : 'Konum alınamadı. Lütfen tekrar deneyin.'
        setLocationError(msg)
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    )
  }, [])

  // Konum değişikliklerini izle (opsiyonel - pil dostu mod)
  const watchLocation = useCallback(() => {
    if (!navigator.geolocation) return
    if (watchIdRef.current !== null) return // Zaten izleniyor

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => { /* Sessizce geç */ },
      { enableHighAccuracy: false, timeout: 30_000, maximumAge: 120_000 }
    )
  }, [])

  const stopWatchingLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  // ─── Kartları yükle ─────────────────────────────────────────────────────────
  const loadCards = useCallback(async (lat: number, lng: number) => {
    setIsLoadingCards(true)
    setCardsError(null)
    try {
      const { data, error } = await cardQueries.getNearby(supabase, lat, lng, radiusMeters)
      if (error) throw error

      const withCoords: CardWithCoords[] = ((data as any[]) ?? []).map((card: any) => {
        const point = parsePostGISPoint(card.location_point)
        return {
          ...card,
          lat: point?.lat ?? lat,
          lng: point?.lng ?? lng,
          distanceMeters: card.distance_meters,
        }
      })

      setCards(withCoords)
    } catch (err) {
      setCardsError(err instanceof Error ? err.message : 'Kartlar yüklenemedi')
    } finally {
      setIsLoadingCards(false)
    }
  }, [supabase, radiusMeters])

  // ─── Realtime abonelik ──────────────────────────────────────────────────────
  const subscribeToCards = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    channelRef.current = supabase
      .channel('map_cards_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_cards' },
        (payload) => {
          const card = payload.new as ActivityCard
          const point = parsePostGISPoint(card.location_point)
          if (!point) return

          // Viewport içindeyse ekle
          const dist = userLocation
            ? haversineDistance(userLocation.lat, userLocation.lng, point.lat, point.lng)
            : null

          if (!dist || dist <= radiusMeters) {
            setCards(prev => [
              { ...card, lat: point.lat, lng: point.lng, distanceMeters: dist ?? undefined },
              ...prev,
            ])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'activity_cards' },
        (payload) => {
          const updated = payload.new as ActivityCard
          setCards(prev =>
            prev.map(c =>
              c.id === updated.id
                ? { ...c, ...updated }
                : c
            )
          )
          // Seçili kart güncellendiyse onu da güncelle
          setSelectedCard(prev =>
            prev?.id === updated.id ? { ...prev, ...updated } : prev
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'activity_cards' },
        (payload) => {
          setCards(prev => prev.filter(c => c.id !== (payload.old as any).id))
          setSelectedCard(prev => prev?.id === (payload.old as any).id ? null : prev)
        }
      )
      .subscribe()
  }, [supabase, userLocation, radiusMeters])

  // ─── Otomatik başlatma ──────────────────────────────────────────────────────
  useEffect(() => {
    if (autoLocate) locateUser()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userLocation) {
      loadCards(userLocation.lat, userLocation.lng)
      subscribeToCards()
      watchLocation()
    }
    return () => stopWatchingLocation()
  }, [userLocation?.lat, userLocation?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      stopWatchingLocation()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Haritaya ortalama ──────────────────────────────────────────────────────
  const flyTo = useCallback((lat: number, lng: number, zoom = 15) => {
    setViewState({ latitude: lat, longitude: lng, zoom })
  }, [])

  const flyToUser = useCallback(() => {
    if (userLocation) flyTo(userLocation.lat, userLocation.lng, 14)
  }, [userLocation, flyTo])

  const flyToCard = useCallback((card: CardWithCoords) => {
    flyTo(card.lat, card.lng, 16)
    setSelectedCard(card)
  }, [flyTo])

  // ─── Kümelenmiş marker'lar ──────────────────────────────────────────────────
  const clusteredCards = clusterPoints(
    cards.map(c => ({ ...c, id: c.id })),
    viewState.zoom
  )

  return {
    // Harita state
    viewState, setViewState,
    userLocation, isLocating, locationError,

    // Kartlar
    cards, clusteredCards, selectedCard,
    isLoadingCards, cardsError,

    // Actions
    locateUser, flyTo, flyToUser, flyToCard,
    selectCard: setSelectedCard,
    refreshCards: () => userLocation
      ? loadCards(userLocation.lat, userLocation.lng)
      : Promise.resolve(),
  }
}
