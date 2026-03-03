'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { postQueries, reactionQueries } from '@cevre/supabase'
import type { Post, ReactionType } from '@cevre/shared'

export function useFeed() {
  const supabase = createClient()
  const { user } = useAuth()
  
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  // Load feed
  const loadFeed = useCallback(async (refresh = false) => {
    if (!user) return
    
    const currentOffset = refresh ? 0 : offset
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await postQueries.getFeed(supabase, user.id, 20, currentOffset)
      if (error) throw error
      
      const newPosts = (data as unknown as Post[]) ?? []
      
      if (refresh) {
        setPosts(newPosts)
        setOffset(20)
      } else {
        setPosts(prev => [...prev, ...newPosts])
        setOffset(prev => prev + 20)
      }
      
      setHasMore(newPosts.length === 20)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feed yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, user, offset])

  // Initial load
  useEffect(() => {
    loadFeed(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load more
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadFeed(false)
    }
  }, [isLoading, hasMore, loadFeed])

  // Refresh
  const refresh = useCallback(() => {
    loadFeed(true)
  }, [loadFeed])

  // Like/unlike post
  const toggleLike = useCallback(async (postId: string, currentlyLiked: boolean, reaction: ReactionType = 'like') => {
    if (!user) return
    
    try {
      if (currentlyLiked) {
        await reactionQueries.remove(supabase, postId, user.id)
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, has_liked: false, like_count: Math.max(p.like_count - 1, 0) }
            : p
        ))
      } else {
        await reactionQueries.add(supabase, postId, user.id, reaction)
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, has_liked: true, user_reaction: reaction, like_count: p.like_count + 1 }
            : p
        ))
      }
    } catch (err) {
      console.error('Like toggle error:', err)
    }
  }, [supabase, user])

  // Delete post (optimistic)
  const deletePost = useCallback(async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
    await postQueries.delete(supabase, postId)
  }, [supabase])

  return {
    posts,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    toggleLike,
    deletePost,
  }
}
