/**
 * FeedService — T1 Service Layer
 * Wraps all social-feed Supabase operations (posts, comments, likes, shares).
 */

import { createClient } from '@/lib/supabase'

export class FeedService {
  private static get db() {
    return createClient()
  }

  /** Fetch paginated feed posts (own + followed users) */
  static async getFeed(limit = 20, offset = 0) {
    const { data, error } = await this.db.rpc('get_user_feed', {
      p_limit: limit,
      p_offset: offset,
    })
    return { data, error }
  }

  /** Get a single post by ID */
  static async getPost(postId: string) {
    const { data, error } = await this.db
      .from('posts')
      .select(`
        *,
        profiles!user_id(id, username, avatar_url, full_name),
        post_likes(count),
        post_comments(count),
        shares(count)
      `)
      .eq('id', postId)
      .single()
    return { data, error }
  }

  /** Create a new post */
  static async createPost(payload: {
    content: string
    media_url?: string[]
    post_type?: 'text' | 'image' | 'video' | 'activity'
    location?: { lat: number; lng: number }
    activity_card_id?: string
    visibility?: 'public' | 'followers' | 'private'
  }) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    const { location, ...rest } = payload
    const { data, error } = await db
      .from('posts')
      .insert({
        ...rest,
        user_id: user.id,
        location: location ? `POINT(${location.lng} ${location.lat})` : undefined,
        post_type: rest.post_type ?? 'text',
        visibility: rest.visibility ?? 'public',
      })
      .select()
      .single()
    return { data, error }
  }

  /** Delete own post */
  static async deletePost(postId: string) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }

    const { error } = await db
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id)
    return { error }
  }

  /** Toggle like on a post */
  static async toggleLike(postId: string): Promise<{ liked: boolean; error: Error | null }> {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { liked: false, error: new Error('Not authenticated') }

    const { data: existing } = await db
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      const { error } = await db
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
      return { liked: false, error: error as Error | null }
    } else {
      const { error } = await db
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id })
      return { liked: true, error: error as Error | null }
    }
  }

  /** Get comments for a post */
  static async getComments(postId: string, limit = 50) {
    const { data, error } = await this.db
      .from('post_comments')
      .select(`
        *,
        profiles!user_id(id, username, avatar_url),
        comment_likes(count)
      `)
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('created_at', { ascending: true })
      .limit(limit)
    return { data, error }
  }

  /** Add a comment */
  static async addComment(postId: string, content: string, parentId?: string) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    const { data, error } = await db
      .from('post_comments')
      .insert({ post_id: postId, user_id: user.id, content, parent_id: parentId ?? null })
      .select()
      .single()
    return { data, error }
  }

  /** Real-time subscription to new feed posts */
  static subscribeToFeed(userId: string, callback: (post: unknown) => void) {
    return this.db
      .channel(`feed-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        callback(payload.new)
      })
      .subscribe()
  }
}
