/**
 * StoryService — T4
 * Wraps Supabase RPC + direct table queries for stories.
 */

import { createClient } from '@/lib/supabase'
import { eventBus, makeEvent } from '@/lib/event-bus'

export interface StoryFeedItem {
  user_id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  has_unseen: boolean
  stories: Array<{
    id: string
    type: 'image' | 'video' | 'text'
    media_url: string | null
    text_content: string | null
    created_at: string
    expires_at: string
    view_count: number
    has_viewed: boolean
  }>
}

export interface CreateStoryPayload {
  type: 'image' | 'video' | 'text'
  media_url?: string
  text_content?: string
  stickers?: Record<string, unknown>[]
  visibility?: 'public' | 'followers' | 'close_friends'
}

export const StoryService = {
  // ── Reads ──────────────────────────────────────────────────────────────

  /** Paginated story feed for a user (24h window, followed users first) */
  async getFeed(userId: string): Promise<StoryFeedItem[]> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('get_stories_feed', {
      p_user_id: userId,
      p_limit: 50,
    })
    if (error) throw error
    return (data as StoryFeedItem[]) ?? []
  },

  /** Stories for a single user (for profile ring / viewer) */
  async getUserStories(userId: string, viewerId: string) {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('get_user_stories', {
      p_user_id: userId,
      p_viewer_id: viewerId,
    })
    if (error) throw error
    return data ?? []
  },

  /** Highlights for a profile page */
  async getHighlights(userId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('story_highlights')
      .select('*, highlight_stories(story_id, stories(*))')
      .eq('user_id', userId)
      .order('position')
    if (error) throw error
    return data ?? []
  },

  // ── Writes ─────────────────────────────────────────────────────────────

  /** Create a new story (expires in 24 h) */
  async createStory(userId: string, payload: CreateStoryPayload) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: userId,
        ...payload,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    eventBus.emit(makeEvent('STORY_UPLOADED', {
      storyId: data.id,
      authorId: userId,
      mediaType: (payload.type === 'video' ? 'video' : 'image') as 'image' | 'video',
    }))
    return data
  },

  /** Record that a user watched a story */
  async viewStory(storyId: string, userId: string, durationMs: number) {
    const supabase = createClient()
    await supabase.from('story_views').upsert(
      { story_id: storyId, user_id: userId, view_duration: durationMs },
      { onConflict: 'story_id,user_id', ignoreDuplicates: true }
    )
  },

  /** Create a highlights collection */
  async createHighlight(userId: string, name: string, coverStoryId?: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('story_highlights')
      .insert({ user_id: userId, name, cover_story_id: coverStoryId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Add a story to an existing highlight */
  async addStoryToHighlight(highlightId: string, storyId: string) {
    const supabase = createClient()
    await supabase
      .from('highlight_stories')
      .upsert({ highlight_id: highlightId, story_id: storyId }, { ignoreDuplicates: true })
  },
}
