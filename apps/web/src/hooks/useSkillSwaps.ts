'use client'

/**
 * useSkillSwaps — T5 SWR Refactor
 * Reads: useSWR + skillSwapQueries
 * Writes: create / cancel with optimistic mutate
 */

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { skillSwapQueries } from '@cevre/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { SkillSwapDetailData } from '@cevre/shared'

export function useSkillSwaps() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  // ── SWR: open swaps (search-aware) ──────────────────────────────────────
  const {
    data: openSwaps = [],
    isLoading,
    error,
    mutate: mutateOpen,
  } = useSWR<SkillSwapDetailData[]>(
    [queryKeys.skillSwaps(), 'open', searchQuery],
    async () => {
      const supabase = createClient()
      const { data, error } = searchQuery
        ? await skillSwapQueries.search(supabase, searchQuery)
        : await skillSwapQueries.getOpen(supabase)
      if (error) throw error
      return (data as unknown as SkillSwapDetailData[]) ?? []
    },
    { revalidateOnFocus: false }
  )

  // ── SWR: my swaps ────────────────────────────────────────────────────────
  const {
    data: mySwaps = [],
    mutate: mutateMySwaps,
  } = useSWR<SkillSwapDetailData[]>(
    user ? ['skill-swaps', 'mine', user.id] : null,
    async () => {
      const supabase = createClient()
      const { data } = await skillSwapQueries.getMySwaps(supabase, user!.id)
      return (data as unknown as SkillSwapDetailData[]) ?? []
    },
    { revalidateOnFocus: false }
  )

  // ── SWR: matched swaps ───────────────────────────────────────────────────
  const { data: matchedSwaps = [], mutate: mutateMatched } = useSWR<SkillSwapDetailData[]>(
    user ? ['skill-swaps', 'matched', user.id] : null,
    async () => {
      const supabase = createClient()
      const { data } = await skillSwapQueries.getMatchedWithMe(supabase, user!.id)
      return (data as unknown as SkillSwapDetailData[]) ?? []
    },
    { revalidateOnFocus: false }
  )

  // ── Write: create ────────────────────────────────────────────────────────
  const createSwap = useCallback(async (data: {
    skill_offered: string
    skill_wanted: string
    description?: string
  }) => {
    if (!user) throw new Error('Giriş yapmanız gerekiyor')
    const supabase = createClient()
    await skillSwapQueries.create(supabase, {
      offerer_id: user.id,
      skill_offered: data.skill_offered.trim(),
      skill_wanted: data.skill_wanted.trim(),
      description: data.description?.trim() ?? null,
      status: 'open',
      matched_user_id: null,
    })
    mutateMySwaps()
    mutateOpen()
  }, [user, mutateMySwaps, mutateOpen])

  // ── Write: cancel ────────────────────────────────────────────────────────
  const cancelSwap = useCallback(async (swapId: string) => {
    const supabase = createClient()
    await skillSwapQueries.cancel(supabase, swapId)
    mutateMySwaps(
      mySwaps.filter((s: any) => s.id !== swapId),
      { revalidate: false }
    )
    mutateOpen()
  }, [mySwaps, mutateMySwaps, mutateOpen])

  return {
    openSwaps,
    mySwaps,
    matchedSwaps,
    isLoading,
    error: error ? String(error) : null,
    searchQuery,
    setSearchQuery,
    createSwap,
    cancelSwap,
    refresh: () => { mutateOpen(); mutateMySwaps(); mutateMatched() },
  }
}

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
