'use client'

/**
 * useFollow â€” T2 Refactor
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

  // â”€â”€ SWR read: follow status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Write: follow (optimistic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const follow = useCallback(async () => {
    if (!user || !targetUserId) return
    mutate({ ...status, is_following: true, has_pending_request: false } as any, { revalidate: false })
    const { error: err } = await FollowService.follow(targetUserId)
    if (err) mutate()
    else mutate()  // refresh actual status (pending vs active)
  }, [user, targetUserId, status, mutate])

  // â”€â”€ Write: unfollow (optimistic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const unfollow = useCallback(async () => {
    if (!user || !targetUserId) return
    mutate({ ...status, is_following: false, is_mutual: false } as any, { revalidate: false })
    const { error: err } = await FollowService.unfollow(targetUserId)
    if (err) mutate()
  }, [user, targetUserId, status, mutate])

  // â”€â”€ Write: accept request â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
