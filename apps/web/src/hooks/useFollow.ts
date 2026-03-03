'use client'

/**
 * useFollow — T2 Refactor
 * Reads: useSWR + FollowService
 * Writes: optimistic follow/unfollow
 */

import { useCallback } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/hooks/useAuth'
import { FollowService } from '@/services/follow.service'
import { queryKeys } from '@/lib/query-keys'

export function useFollow(targetUserId?: string) {
  const { user } = useAuth()

  // ── SWR read: follow status ─────────────────────────────────────────────
  const swrKey = user && targetUserId && user.id !== targetUserId
    ? queryKeys.followStatus(user.id, targetUserId)
    : null

  const { data: status, isLoading, error, mutate } = useSWR(
    swrKey,
    () => FollowService.getStatus(user!.id, targetUserId!),
    { revalidateOnFocus: false }
  )

  const isFollowing = status?.is_following ?? false
  const isFollower = status?.is_follower ?? false
  const isMutual = status?.is_mutual ?? false
  const hasPendingRequest = status?.has_pending_request ?? false

  // ── Write: follow (optimistic) ───────────────────────────────────────────
  const follow = useCallback(async () => {
    if (!user || !targetUserId) return
    mutate({ ...status, is_following: true, has_pending_request: false } as any, { revalidate: false })
    const { error: err } = await FollowService.follow(targetUserId)
    if (err) mutate()
    else mutate()  // refresh actual status (pending vs active)
  }, [user, targetUserId, status, mutate])

  // ── Write: unfollow (optimistic) ─────────────────────────────────────────
  const unfollow = useCallback(async () => {
    if (!user || !targetUserId) return
    mutate({ ...status, is_following: false, is_mutual: false } as any, { revalidate: false })
    const { error: err } = await FollowService.unfollow(targetUserId)
    if (err) mutate()
  }, [user, targetUserId, status, mutate])

  // ── Write: accept request ────────────────────────────────────────────────
  const acceptRequest = useCallback(async (followerId: string) => {
    await FollowService.acceptRequest(followerId)
    mutate()
  }, [mutate])

  return {
    isFollowing,
    isFollower,
    isMutual,
    hasPendingRequest,
    isLoading,
    error: error ? String(error) : null,
    follow,
    unfollow,
    acceptRequest,
  }
}

export function useFollow(targetUserId?: string) {
  const supabase = createClient()
  const { user } = useAuth()
  
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollower, setIsFollower] = useState(false)
  const [isMutual, setIsMutual] = useState(false)
  const [hasPendingRequest, setHasPendingRequest] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check follow status
  const checkStatus = useCallback(async () => {
    if (!user || !targetUserId || user.id === targetUserId) return
    
    setIsLoading(true)
    try {
      const status = await followQueries.checkStatus(supabase, user.id, targetUserId)
      setIsFollowing(status.is_following)
      setIsFollower(status.is_follower)
      setIsMutual(status.is_mutual)
      setHasPendingRequest(status.has_pending_request)
    } catch (err) {
      console.error('Follow status check error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, user, targetUserId])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  // Follow
  const follow = useCallback(async () => {
    if (!user || !targetUserId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const { error } = await followQueries.follow(supabase, targetUserId, user.id)
      if (error) throw error
      await checkStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Takip edilemedi')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, user, targetUserId, checkStatus])

  // Unfollow
  const unfollow = useCallback(async () => {
    if (!user || !targetUserId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const { error } = await followQueries.unfollow(supabase, targetUserId, user.id)
      if (error) throw error
      await checkStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Takipten çıkılamadı')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, user, targetUserId, checkStatus])

  return {
    isFollowing,
    isFollower,
    isMutual,
    hasPendingRequest,
    isLoading,
    error,
    follow,
    unfollow,
  }
}
