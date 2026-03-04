'use client'

/**
 * useNeighborhoods — T5 SWR Refactor
 * Reads: useSWR + Supabase neighborhood queries
 * Writes: join / leave with optimistic membership update
 */

import { useCallback } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { neighborhoodQueries } from '@cevre/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { Neighborhood, NeighborhoodRole } from '@cevre/supabase'

export function useNeighborhoods(filters?: { city?: string; district?: string }) {
  const { user } = useAuth()

  // ── SWR: all neighborhoods ──────────────────────────────────────────────
  const {
    data: neighborhoods = [],
    isLoading,
    error,
    mutate: mutateNeighborhoods,
  } = useSWR<Neighborhood[]>(
    [queryKeys.neighborhoods(), filters?.city, filters?.district],
    async () => {
      const supabase = createClient()
      const { data, error } = await neighborhoodQueries.getAll(supabase, filters)
      if (error) throw error
      return data ?? []
    },
    { revalidateOnFocus: false }
  )

  // ── SWR: user's memberships ─────────────────────────────────────────────
  const {
    data: myNeighborhoods = [],
    mutate: mutateMemberships,
  } = useSWR<{ neighborhood_id: string; role: NeighborhoodRole }[]>(
    user ? ['neighborhoods', 'mine', user.id] : null,
    async () => {
      const supabase = createClient()
      const { data } = await neighborhoodQueries.getMyNeighborhoods(supabase, user!.id)
      return (data ?? []).map((m: any) => ({
        neighborhood_id: m.neighborhood.id,
        role: m.role as NeighborhoodRole,
      }))
    },
    { revalidateOnFocus: false }
  )

  // ── Write: join ─────────────────────────────────────────────────────────
  const joinNeighborhood = useCallback(async (neighborhoodId: string) => {
    if (!user) throw new Error('Giriş yapmanız gerekiyor')
    const supabase = createClient()
    await neighborhoodQueries.join(supabase, neighborhoodId, user.id)
    mutateMemberships()
    mutateNeighborhoods()
  }, [user, mutateMemberships, mutateNeighborhoods])

  // ── Write: leave ─────────────────────────────────────────────────────────
  const leaveNeighborhood = useCallback(async (neighborhoodId: string) => {
    if (!user) return
    const supabase = createClient()
    await neighborhoodQueries.leave(supabase, neighborhoodId, user.id)
    mutateMemberships(
      myNeighborhoods.filter(m => m.neighborhood_id !== neighborhoodId),
      { revalidate: false }
    )
    mutateNeighborhoods()
  }, [user, myNeighborhoods, mutateMemberships, mutateNeighborhoods])

  const isMember = useCallback(
    (neighborhoodId: string) => myNeighborhoods.some(m => m.neighborhood_id === neighborhoodId),
    [myNeighborhoods]
  )

  const getMyRole = useCallback(
    (neighborhoodId: string): NeighborhoodRole | null =>
      myNeighborhoods.find(m => m.neighborhood_id === neighborhoodId)?.role ?? null,
    [myNeighborhoods]
  )

  return {
    neighborhoods,
    myNeighborhoods,
    isLoading,
    error: error ? String(error) : null,
    joinNeighborhood,
    leaveNeighborhood,
    isMember,
    getMyRole,
    refresh: () => { mutateNeighborhoods(); mutateMemberships() },
  }
}
