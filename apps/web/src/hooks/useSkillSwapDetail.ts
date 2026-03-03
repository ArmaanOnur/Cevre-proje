'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { skillSwapQueries } from '@cevre/supabase'
import type { SkillSwapDetailData } from '@cevre/shared'

export function useSkillSwapDetail(swapId: string) {
  const supabase = createClient()
  const { user } = useAuth()

  const [swap, setSwap] = useState<SkillSwapDetailData | null>(null)
  const [potentialMatches, setPotentialMatches] = useState<SkillSwapDetailData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMatching, setIsMatching] = useState(false)

  // Teklifi yükle
  const loadSwap = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await skillSwapQueries.getById(supabase, swapId)
      if (error) throw error
      setSwap(data as unknown as SkillSwapDetailData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Teklif yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, swapId])

  // Potansiyel eşleşmeleri yükle
  const loadMatches = useCallback(async () => {
    if (!user || !swap || swap.status !== 'open') return
    const { data } = await skillSwapQueries.findMatches(supabase, swapId, user.id)
    setPotentialMatches((data as unknown as SkillSwapDetailData[]) ?? [])
  }, [supabase, swapId, user, swap])

  useEffect(() => {
    loadSwap()
  }, [loadSwap])

  useEffect(() => {
    if (swap) loadMatches()
  }, [swap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime
  useEffect(() => {
    const channel = skillSwapQueries.subscribe(supabase, swapId, () => loadSwap())
    return () => { supabase.removeChannel(channel) }
  }, [swapId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Eşleş
  const match = useCallback(async (matchedUserId: string) => {
    setIsMatching(true)
    try {
      await skillSwapQueries.match(supabase, swapId, matchedUserId)
      await loadSwap()
    } finally {
      setIsMatching(false)
    }
  }, [supabase, swapId, loadSwap])

  // Tamamla
  const complete = useCallback(async () => {
    await skillSwapQueries.complete(supabase, swapId)
    await loadSwap()
  }, [supabase, swapId, loadSwap])

  // İptal et
  const cancel = useCallback(async () => {
    await skillSwapQueries.cancel(supabase, swapId)
    await loadSwap()
  }, [supabase, swapId, loadSwap])

  // Eşleşmeyi çöz
  const unmatch = useCallback(async () => {
    await skillSwapQueries.unmatch(supabase, swapId)
    await loadSwap()
  }, [supabase, swapId, loadSwap])

  const isOwner = user?.id === swap?.offerer_id
  const isMatchedUser = user?.id === swap?.matched_user_id

  return {
    swap,
    potentialMatches,
    isLoading,
    error,
    isMatching,
    isOwner,
    isMatchedUser,
    match,
    complete,
    cancel,
    unmatch,
    refresh: loadSwap,
  }
}
