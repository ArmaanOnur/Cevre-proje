'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { aiRecommendationQueries } from '@cevre/supabase'
import type { InteractionType } from '@cevre/shared'

export function useRecommendations() {
  const supabase = createClient()
  const { user } = useAuth()
  
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [preferences, setPreferences] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      // Önce cache'den dene
      const { data: cached } = await aiRecommendationQueries.getCachedRecommendations(
        supabase, user.id, 'card', 20
      )
      
      if (cached && cached.length > 0) {
        setRecommendations(cached)
      } else {
        // Cache yoksa, gerçek zamanlı hesapla
        const { data: recommended } = await aiRecommendationQueries.getRecommendedCards(
          supabase, user.id, 20
        )
        setRecommendations(recommended ?? [])
      }
      
      // Tercihleri yükle
      const { data: prefs } = await aiRecommendationQueries.getUserPreferences(supabase, user.id)
      setPreferences(prefs)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, user])

  useEffect(() => { load() }, [load])

  const trackInteraction = useCallback(async (
    targetType: string,
    targetId: string,
    interactionType: InteractionType,
    context?: Record<string, any>
  ) => {
    if (!user) return
    await aiRecommendationQueries.trackInteraction(
      supabase, user.id, targetType, targetId, interactionType, undefined, context
    )
  }, [supabase, user])

  const refreshPreferences = useCallback(async () => {
    if (!user) return
    await aiRecommendationQueries.refreshPreferences(supabase, user.id)
    await load()
  }, [supabase, user, load])

  return {
    recommendations,
    preferences,
    isLoading,
    trackInteraction,
    refreshPreferences,
    refresh: load,
  }
}
