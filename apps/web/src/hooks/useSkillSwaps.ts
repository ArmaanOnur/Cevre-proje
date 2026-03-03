'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { skillSwapQueries } from '@cevre/supabase'
import type { SkillSwapDetailData } from '@cevre/shared'

export function useSkillSwaps() {
  const supabase = createClient()
  const { user } = useAuth()

  const [openSwaps, setOpenSwaps] = useState<SkillSwapDetailData[]>([])
  const [mySwaps, setMySwaps] = useState<SkillSwapDetailData[]>([])
  const [matchedSwaps, setMatchedSwaps] = useState<SkillSwapDetailData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Açık teklifleri yükle
  const loadOpenSwaps = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = searchQuery
        ? await skillSwapQueries.search(supabase, searchQuery)
        : await skillSwapQueries.getOpen(supabase)
      
      if (error) throw error
      setOpenSwaps(data as unknown as SkillSwapDetailData[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Teklifler yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, searchQuery])

  // Benim tekliflerimi yükle
  const loadMySwaps = useCallback(async () => {
    if (!user) return
    const { data } = await skillSwapQueries.getMySwaps(supabase, user.id)
    setMySwaps((data as unknown as SkillSwapDetailData[]) ?? [])
  }, [supabase, user])

  // Benimle eşleşenleri yükle
  const loadMatchedSwaps = useCallback(async () => {
    if (!user) return
    const { data } = await skillSwapQueries.getMatchedWithMe(supabase, user.id)
    setMatchedSwaps((data as unknown as SkillSwapDetailData[]) ?? [])
  }, [supabase, user])

  // İlk yükleme
  useEffect(() => {
    loadOpenSwaps()
    loadMySwaps()
    loadMatchedSwaps()
  }, [loadOpenSwaps, loadMySwaps, loadMatchedSwaps])

  // Yeni teklif oluştur
  const createSwap = useCallback(async (data: {
    skill_offered: string
    skill_wanted: string
    description?: string
  }) => {
    if (!user) throw new Error('Giriş yapmanız gerekiyor')
    
    await skillSwapQueries.create(supabase, {
      offerer_id: user.id,
      skill_offered: data.skill_offered.trim(),
      skill_wanted: data.skill_wanted.trim(),
      description: data.description?.trim() ?? null,
      status: 'open',
      matched_user_id: null,
    })
    
    await loadMySwaps()
    await loadOpenSwaps()
  }, [supabase, user, loadMySwaps, loadOpenSwaps])

  // Teklifi iptal et
  const cancelSwap = useCallback(async (swapId: string) => {
    await skillSwapQueries.cancel(supabase, swapId)
    await loadMySwaps()
    await loadOpenSwaps()
  }, [supabase, loadMySwaps, loadOpenSwaps])

  return {
    openSwaps,
    mySwaps,
    matchedSwaps,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    createSwap,
    cancelSwap,
    refresh: loadOpenSwaps,
  }
}
