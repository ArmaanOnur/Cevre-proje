'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function useStories() {
  const supabase = createClient()
  const { user } = useAuth()
  
  const [storyFeed, setStoryFeed] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load stories feed
  const loadFeed = useCallback(async () => {
    if (!user) return
    
    setIsLoading(true)
    const { data } = await supabase.rpc('get_stories_feed', {
      p_user_id: user.id,
      p_limit: 50,
    })
    
    setStoryFeed(data || [])
    setIsLoading(false)
  }, [supabase, user])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  // Create story
  const createStory = useCallback(async (storyData: {
    type: 'image' | 'video' | 'text'
    media_url?: string
    text_content?: string
    stickers?: any[]
    visibility?: 'public' | 'followers' | 'close_friends'
  }) => {
    if (!user) throw new Error('Not authenticated')
    
    const { data, error } = await supabase.from('stories').insert({
      user_id: user.id,
      ...storyData,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()
    
    if (error) throw error
    return data
  }, [supabase, user])

  // Mark story as viewed
  const viewStory = useCallback(async (storyId: string, duration: number) => {
    if (!user) return
    
    await supabase.from('story_views').insert({
      story_id: storyId,
      user_id: user.id,
      view_duration: duration,
    })
  }, [supabase, user])

  // Get user stories
  const getUserStories = useCallback(async (userId: string) => {
    if (!user) return []
    
    const { data } = await supabase.rpc('get_user_stories', {
      p_user_id: userId,
      p_viewer_id: user.id,
    })
    
    return data || []
  }, [supabase, user])

  return {
    storyFeed,
    isLoading,
    createStory,
    viewStory,
    getUserStories,
    refresh: loadFeed,
  }
}

// Hook for story highlights
export function useHighlights(userId?: string) {
  const supabase = createClient()
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  
  const [highlights, setHighlights] = useState<any[]>([])

  useEffect(() => {
    if (!targetUserId) return
    
    supabase
      .from('story_highlights')
      .select('*')
      .eq('user_id', targetUserId)
      .order('position')
      .then(({ data }) => setHighlights(data || []))
  }, [supabase, targetUserId])

  const createHighlight = useCallback(async (name: string, coverStoryId?: string) => {
    if (!user) throw new Error('Not authenticated')
    
    const { data, error } = await supabase.from('story_highlights').insert({
      user_id: user.id,
      name,
      cover_story_id: coverStoryId,
    }).select().single()
    
    if (error) throw error
    setHighlights(prev => [...prev, data])
    return data
  }, [supabase, user])

  const addStoryToHighlight = useCallback(async (highlightId: string, storyId: string) => {
    await supabase.from('highlight_stories').insert({
      highlight_id: highlightId,
      story_id: storyId,
    })
  }, [supabase])

  return {
    highlights,
    createHighlight,
    addStoryToHighlight,
  }
}
