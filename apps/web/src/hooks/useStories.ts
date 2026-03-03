'use client'

/**
 * useStories — T4 Refactor
 * Reads: SWR-cached story feed
 * Writes: StoryService mutations with optimistic updates
 */

import { useCallback } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/hooks/useAuth'
import { StoryService, type StoryFeedItem, type CreateStoryPayload } from '@/services/story.service'
import { queryKeys } from '@/lib/query-keys'

// ── Main hook ──────────────────────────────────────────────────────────────

export function useStories() {
  const { user } = useAuth()

  const feedKey = user ? queryKeys.storyFeed(user.id) : null

  // SWR: 60 s revalidation — stories change frequently
  const {
    data: storyFeed = [],
    isLoading,
    error,
    mutate,
  } = useSWR<StoryFeedItem[]>(
    feedKey,
    () => StoryService.getFeed(user!.id),
    { refreshInterval: 60_000, revalidateOnFocus: true }
  )

  // ── Write: create story ───────────────────────────────────────────────
  const createStory = useCallback(async (payload: CreateStoryPayload) => {
    if (!user) throw new Error('Not authenticated')
    const story = await StoryService.createStory(user.id, payload)
    mutate() // refresh feed after creation
    return story
  }, [user, mutate])

  // ── Write: mark story as viewed ───────────────────────────────────────
  const viewStory = useCallback(async (storyId: string, durationMs: number) => {
    if (!user) return
    await StoryService.viewStory(storyId, user.id, durationMs)
    // Optimistically mark as seen in local data
    mutate(
      storyFeed.map(userStories => ({
        ...userStories,
        has_unseen: userStories.stories.some(
          s => s.id !== storyId && !s.has_viewed
        ),
        stories: userStories.stories.map(s =>
          s.id === storyId ? { ...s, has_viewed: true } : s
        ),
      })),
      { revalidate: false }
    )
  }, [user, storyFeed, mutate])

  // ── Read: stories for a specific user ────────────────────────────────
  const getUserStories = useCallback(async (userId: string) => {
    if (!user) return []
    return StoryService.getUserStories(userId, user.id)
  }, [user])

  return {
    storyFeed,
    isLoading,
    error: error ? String(error) : null,
    createStory,
    viewStory,
    getUserStories,
    refresh: () => mutate(),
  }
}

// ── Highlights hook ───────────────────────────────────────────────────────

export function useHighlights(userId?: string) {
  const { user } = useAuth()
  const targetId = userId ?? user?.id

  const {
    data: highlights = [],
    isLoading,
    mutate,
  } = useSWR(
    targetId ? ['highlights', targetId] : null,
    () => StoryService.getHighlights(targetId!),
    { revalidateOnFocus: false }
  )

  const createHighlight = useCallback(async (name: string, coverStoryId?: string) => {
    if (!user) throw new Error('Not authenticated')
    const created = await StoryService.createHighlight(user.id, name, coverStoryId)
    mutate([...highlights, created], { revalidate: false })
    return created
  }, [user, highlights, mutate])

  const addStoryToHighlight = useCallback(async (highlightId: string, storyId: string) => {
    await StoryService.addStoryToHighlight(highlightId, storyId)
    mutate()
  }, [mutate])

  return {
    highlights,
    isLoading,
    createHighlight,
    addStoryToHighlight,
  }
}

// ── Story viewer hook (per-user ring data) ────────────────────────────────

export function useUserStories(userId?: string) {
  const { user } = useAuth()
  const targetId = userId ?? user?.id

  const { data: stories = [], isLoading } = useSWR(
    targetId && user ? ['userStories', targetId, user.id] : null,
    () => StoryService.getUserStories(targetId!, user!.id),
    { revalidateOnFocus: false }
  )

  return { stories, isLoading }
}
