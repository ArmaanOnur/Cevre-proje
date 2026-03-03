'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { followQueries } from '@cevre/supabase'

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
