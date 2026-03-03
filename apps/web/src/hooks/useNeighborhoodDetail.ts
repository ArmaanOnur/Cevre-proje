'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { neighborhoodQueries } from '@cevre/supabase'
import type { NeighborhoodDetailData } from '@cevre/shared'
import type { NeighborhoodRole } from '@cevre/supabase'

export function useNeighborhoodDetail(neighborhoodId: string) {
  const supabase = createClient()
  const { user } = useAuth()

  const [neighborhood, setNeighborhood] = useState<NeighborhoodDetailData | null>(null)
  const [recentCards, setRecentCards] = useState<any[]>([])
  const [myRole, setMyRole] = useState<NeighborhoodRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  // Mahalle yükle
  const loadNeighborhood = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await neighborhoodQueries.getById(supabase, neighborhoodId)
      if (error) throw error
      setNeighborhood(data as unknown as NeighborhoodDetailData)

      // Üyeliği kontrol et
      if (user) {
        const membership = (data as any).neighborhood_members?.find(
          (m: any) => m.user_id === user.id
        )
        setMyRole(membership?.role ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mahalle yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, neighborhoodId, user])

  // Son aktiviteleri yükle
  const loadRecentCards = useCallback(async () => {
    if (!neighborhood) return
    const { data } = await neighborhoodQueries.getRecentCards(
      supabase,
      neighborhood.city,
      neighborhood.district,
      10
    )
    setRecentCards(data ?? [])
  }, [supabase, neighborhood])

  useEffect(() => {
    loadNeighborhood()
  }, [loadNeighborhood])

  useEffect(() => {
    if (neighborhood) loadRecentCards()
  }, [neighborhood]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime
  useEffect(() => {
    const channel = neighborhoodQueries.subscribe(
      supabase,
      neighborhoodId,
      () => loadNeighborhood(),
      () => loadNeighborhood()
    )
    return () => { supabase.removeChannel(channel) }
  }, [neighborhoodId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Katıl
  const join = useCallback(async () => {
    if (!user) throw new Error('Giriş yapmanız gerekiyor')
    setIsJoining(true)
    try {
      await neighborhoodQueries.join(supabase, neighborhoodId, user.id)
      await loadNeighborhood()
    } finally {
      setIsJoining(false)
    }
  }, [supabase, user, neighborhoodId, loadNeighborhood])

  // Ayrıl
  const leave = useCallback(async () => {
    if (!user) return
    setIsJoining(true)
    try {
      await neighborhoodQueries.leave(supabase, neighborhoodId, user.id)
      await loadNeighborhood()
    } finally {
      setIsJoining(false)
    }
  }, [supabase, user, neighborhoodId, loadNeighborhood])

  // Rol güncelle (admin için)
  const updateMemberRole = useCallback(async (
    userId: string,
    newRole: NeighborhoodRole
  ) => {
    await neighborhoodQueries.updateMemberRole(supabase, neighborhoodId, userId, newRole)
    await loadNeighborhood()
  }, [supabase, neighborhoodId, loadNeighborhood])

  // Üye çıkar (admin/moderator için)
  const removeMember = useCallback(async (userId: string) => {
    await neighborhoodQueries.removeMember(supabase, neighborhoodId, userId)
    await loadNeighborhood()
  }, [supabase, neighborhoodId, loadNeighborhood])

  const isMember = !!myRole
  const isAdmin = myRole === 'admin'
  const isModerator = myRole === 'moderator' || myRole === 'admin'

  return {
    neighborhood,
    recentCards,
    myRole,
    isMember,
    isAdmin,
    isModerator,
    isLoading,
    error,
    isJoining,
    join,
    leave,
    updateMemberRole,
    removeMember,
    refresh: loadNeighborhood,
  }
}
