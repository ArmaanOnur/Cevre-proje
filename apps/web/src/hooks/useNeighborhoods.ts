'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { neighborhoodQueries } from '@cevre/supabase'
import type { Neighborhood, NeighborhoodRole } from '@cevre/supabase'

export function useNeighborhoods(filters?: { city?: string; district?: string }) {
  const supabase = createClient()
  const { user } = useAuth()
  
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [myNeighborhoods, setMyNeighborhoods] = useState<{
    neighborhood_id: string
    role: NeighborhoodRole
  }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mahalleleri yükle
  const loadNeighborhoods = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await neighborhoodQueries.getAll(supabase, filters)
      if (error) throw error
      setNeighborhoods(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mahalleler yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, filters?.city, filters?.district]) // eslint-disable-line react-hooks/exhaustive-deps

  // Kullanıcının üyeliklerini yükle
  const loadMyMemberships = useCallback(async () => {
    if (!user) return
    const { data } = await neighborhoodQueries.getMyNeighborhoods(supabase, user.id)
    if (data) {
      setMyNeighborhoods(
        data.map((m: any) => ({
          neighborhood_id: m.neighborhood.id,
          role: m.role,
        }))
      )
    }
  }, [supabase, user])

  useEffect(() => {
    loadNeighborhoods()
    loadMyMemberships()
  }, [loadNeighborhoods, loadMyMemberships])

  // Mahalleye katıl
  const joinNeighborhood = useCallback(async (neighborhoodId: string) => {
    if (!user) throw new Error('Giriş yapmanız gerekiyor')
    await neighborhoodQueries.join(supabase, neighborhoodId, user.id)
    await loadMyMemberships()
    await loadNeighborhoods()
  }, [supabase, user, loadMyMemberships, loadNeighborhoods])

  // Mahalleden ayrıl
  const leaveNeighborhood = useCallback(async (neighborhoodId: string) => {
    if (!user) return
    await neighborhoodQueries.leave(supabase, neighborhoodId, user.id)
    await loadMyMemberships()
    await loadNeighborhoods()
  }, [supabase, user, loadMyMemberships, loadNeighborhoods])

  // Kullanıcı bu mahallenin üyesi mi?
  const isMember = useCallback((neighborhoodId: string) => {
    return myNeighborhoods.some(m => m.neighborhood_id === neighborhoodId)
  }, [myNeighborhoods])

  // Kullanıcının rolü
  const getMyRole = useCallback((neighborhoodId: string): NeighborhoodRole | null => {
    return myNeighborhoods.find(m => m.neighborhood_id === neighborhoodId)?.role ?? null
  }, [myNeighborhoods])

  return {
    neighborhoods,
    myNeighborhoods,
    isLoading,
    error,
    joinNeighborhood,
    leaveNeighborhood,
    isMember,
    getMyRole,
    refresh: loadNeighborhoods,
  }
}
