'use client'

/**
 * useFeed — T2 Refactor
 * Reads: useSWRInfinite for paginated feed
 * Writes: FeedService with optimistic mutate
 */

import { useCallback } from 'react'
import useSWRInfinite from 'swr/infinite'
import { useAuth } from '@/hooks/useAuth'
import { FeedService } from '@/services/feed.service'
import { commandBus } from '@/cqrs'
import { queryKeys } from '@/lib/query-keys'
import type { Post, ReactionType } from '@cevre/shared'

const PAGE_SIZE = 20

export function useFeed() {
  const { user } = useAuth()

  // ── SWR Infinite: paginated feed ────────────────────────────────────────
  const getKey = (pageIndex: number) =>
    user ? [...queryKeys.feed(user.id), pageIndex] : null

  const {
    data: pages,
    isLoading,
    error,
    mutate,
    size,
    setSize,
  } = useSWRInfinite<Post[]>(
    getKey,
    (key) => {
      const pageIndex = key[key.length - 1] as number
      return FeedService.getFeed(PAGE_SIZE, pageIndex * PAGE_SIZE)
        .then(r => { if (r.error) throw r.error; return (r.data ?? []) as Post[] })
    },
    { revalidateFirstPage: false, revalidateOnFocus: false }
  )

  const posts = pages?.flat() ?? []
  const hasMore = (pages?.at(-1)?.length ?? 0) === PAGE_SIZE
  const isLoadingMore = isLoading || (size > 0 && pages && typeof pages[size - 1] === 'undefined')

  // ── Write: toggle like (optimistic) ─────────────────────────────────────
  const toggleLike = useCallback(async (postId: string, currentlyLiked: boolean, reaction: ReactionType = 'like') => {
    if (!user) return

    // Optimistic update across all pages
    mutate(
      pages?.map(page =>
        page.map(p =>
          p.id !== postId ? p : {
            ...p,
            has_liked: !currentlyLiked,
            user_reaction: currentlyLiked ? null : reaction,
            like_count: Math.max((p.like_count ?? 0) + (currentlyLiked ? -1 : 1), 0),
          }
        )
      ),
      { revalidate: false }
    )

    try {
      await commandBus.dispatch({ type: 'TOGGLE_LIKE', payload: { postId } })
    } catch {
      mutate() // rollback
    }
  }, [user, pages, mutate])

  // ── Write: delete post (optimistic) ─────────────────────────────────────
  const deletePost = useCallback(async (postId: string) => {
    mutate(
      pages?.map(page => page.filter(p => p.id !== postId)),
      { revalidate: false }
    )
    await commandBus.dispatch({ type: 'DELETE_POST', payload: { postId } })
  }, [pages, mutate])

  // ── Write: create post ──────────────────────────────────────────────────
  const createPost = useCallback(async (payload: {
    content: string
    visibility?: 'public' | 'followers' | 'private'
    media_url?: string[]
  }) => {
    const { data, error } = await commandBus.dispatch({ type: 'CREATE_POST', payload })
    if (error) throw new Error((error as any).message)
    // Prepend new post to first page
    mutate(
      pages ? [[data as any, ...(pages[0] ?? [])], ...pages.slice(1)] : undefined,
      { revalidate: false }
    )
    return data
  }, [pages, mutate])

  // ── Write: add comment ───────────────────────────────────────────────────
  const addComment = useCallback(async (postId: string, content: string) => {
    await commandBus.dispatch({ type: 'ADD_COMMENT', payload: { postId, content } })
    // Bump comment count optimistically
    mutate(
      pages?.map(page =>
        page.map(p => p.id !== postId ? p : {
          ...p,
          comment_count: (p.comment_count ?? 0) + 1,
        })
      ),
      { revalidate: false }
    )
  }, [pages, mutate])

  return {
    posts,
    isLoading,
    error: error ? String(error) : null,
    hasMore,
    isLoadingMore: !!isLoadingMore,
    loadMore: () => setSize(s => s + 1),
    refresh: () => mutate(),
    toggleLike,
    deletePost,
    createPost,
    addComment,
  }
}
