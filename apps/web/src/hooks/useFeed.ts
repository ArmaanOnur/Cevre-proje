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
      await FeedService.toggleLike(postId)
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
    await FeedService.deletePost(postId)
  }, [pages, mutate])

  // ── Write: add comment ───────────────────────────────────────────────────
  const addComment = useCallback(async (postId: string, content: string) => {
    await FeedService.addComment(postId, content)
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
    addComment,
  }
}

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
