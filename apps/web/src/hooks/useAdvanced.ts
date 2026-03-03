'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ═══════════════════════════════════════════════════════════════════════
// REELS HOOK
// ═══════════════════════════════════════════════════════════════════════

export function useReels() {
  const supabase = createClient()
  const { user } = useAuth()
  
  const [reels, setReels] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)

  const loadReels = useCallback(async (offset = 0) => {
    setIsLoading(true)
    
    const { data } = await supabase
      .from('reels')
      .select('*, user:users(*)')
      .order('trending_score', { ascending: false })
      .range(offset, offset + 19)
    
    if (data) {
      setReels(prev => offset === 0 ? data : [...prev, ...data])
      setHasMore(data.length === 20)
    }
    
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    loadReels()
  }, [loadReels])

  const createReel = useCallback(async (reelData: {
    video_url: string
    thumbnail_url: string
    duration: number
    caption?: string
    hashtags?: string[]
  }) => {
    if (!user) throw new Error('Not authenticated')
    
    const { data, error } = await supabase.from('reels').insert({
      user_id: user.id,
      ...reelData,
    }).select().single()
    
    if (error) throw error
    return data
  }, [supabase, user])

  const likeReel = useCallback(async (reelId: string, currentlyLiked: boolean) => {
    if (!user) return
    
    if (currentlyLiked) {
      await supabase.from('reel_likes').delete()
        .eq('reel_id', reelId)
        .eq('user_id', user.id)
    } else {
      await supabase.from('reel_likes').insert({
        reel_id: reelId,
        user_id: user.id,
      })
    }
  }, [supabase, user])

  return {
    reels,
    isLoading,
    hasMore,
    createReel,
    likeReel,
    loadMore: () => loadReels(reels.length),
  }
}

// ═══════════════════════════════════════════════════════════════════════
// LIVE STREAM HOOK
// ═══════════════════════════════════════════════════════════════════════

export function useLiveStream(streamId?: string) {
  const supabase = createClient()
  const { user } = useAuth()
  
  const [stream, setStream] = useState<any>(null)
  const [viewers, setViewers] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])

  useEffect(() => {
    if (!streamId) return
    
    // Load stream
    supabase.from('live_streams')
      .select('*, user:users(*)')
      .eq('id', streamId)
      .single()
      .then(({ data }) => setStream(data))
    
    // Subscribe to comments
    const channel = supabase
      .channel(`live_${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_comments',
        filter: `stream_id=eq.${streamId}`,
      }, (payload) => {
        setComments(prev => [...prev, payload.new])
      })
      .subscribe()
    
    return () => {
      channel.unsubscribe()
    }
  }, [supabase, streamId])

  const startStream = useCallback(async (title: string) => {
    if (!user) throw new Error('Not authenticated')
    
    const streamKey = `live_${Date.now()}`
    
    const { data, error } = await supabase.from('live_streams').insert({
      user_id: user.id,
      title,
      stream_key: streamKey,
      rtmp_url: `rtmp://live.cevre.app/live/${streamKey}`,
      status: 'live',
      started_at: new Date().toISOString(),
    }).select().single()
    
    if (error) throw error
    return data
  }, [supabase, user])

  const sendComment = useCallback(async (content: string) => {
    if (!user || !streamId) return
    
    await supabase.from('live_comments').insert({
      stream_id: streamId,
      user_id: user.id,
      content,
    })
  }, [supabase, user, streamId])

  const sendGift = useCallback(async (giftId: string, amount: number) => {
    if (!user || !streamId) return
    
    const streamData = stream
    if (!streamData) return
    
    await supabase.from('gift_transactions').insert({
      sender_id: user.id,
      receiver_id: streamData.user_id,
      gift_id: giftId,
      stream_id: streamId,
      amount,
    })
  }, [supabase, user, streamId, stream])

  return {
    stream,
    viewers,
    comments,
    startStream,
    sendComment,
    sendGift,
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EXPLORE HOOK
// ═══════════════════════════════════════════════════════════════════════

export function useExplore() {
  const supabase = createClient()
  
  const [trending, setTrending] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])

  useEffect(() => {
    // Load trending topics
    supabase.from('trending_topics')
      .select('*')
      .order('score', { ascending: false })
      .limit(10)
      .then(({ data }) => setTrending(data || []))
  }, [supabase])

  const search = useCallback(async (query: string) => {
    // Search posts
    const { data: posts } = await supabase
      .from('posts')
      .select('*, user:users(*)')
      .or(`content.ilike.%${query}%,tags.cs.{${query}}`)
      .limit(20)
    
    // Search users
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(10)
    
    setSearchResults([
      ...(posts || []).map(p => ({ ...p, type: 'post' })),
      ...(users || []).map(u => ({ ...u, type: 'user' })),
    ])
  }, [supabase])

  return {
    trending,
    searchResults,
    search,
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ACHIEVEMENTS HOOK
// ═══════════════════════════════════════════════════════════════════════

export function useAchievements() {
  const supabase = createClient()
  const { user } = useAuth()
  
  const [userPoints, setUserPoints] = useState<any>(null)
  const [achievements, setAchievements] = useState<any[]>([])
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    
    // Load user points
    supabase.from('user_points')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setUserPoints(data))
    
    // Load achievements
    supabase.from('achievements')
      .select('*')
      .order('points')
      .then(({ data }) => setAchievements(data || []))
    
    // Load unlocked achievements
    supabase.from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setUnlockedIds(new Set(data?.map(a => a.achievement_id) || []))
      })
  }, [supabase, user])

  const checkAchievements = useCallback(async () => {
    if (!user) return
    
    await supabase.rpc('check_achievements', {
      p_user_id: user.id,
    })
    
    // Reload
    window.location.reload()
  }, [supabase, user])

  return {
    userPoints,
    achievements,
    unlockedIds,
    checkAchievements,
  }
}

// ═══════════════════════════════════════════════════════════════════════
