// packages/supabase/src/social-queries.ts
import type { TypedSupabaseClient } from './client'
import type { PostType, PostVisibility, ReactionType, ShareType } from '@cevre/shared'

// ═══════════════════════════════════════════════════════════════════════
// PROFILE QUERIES
// ═══════════════════════════════════════════════════════════════════════

export const profileQueries = {
  /** Get enhanced profile by username or ID */
  getByUsername: (supabase: TypedSupabaseClient, username: string) =>
    supabase
      .from('user_profiles_enhanced')
      .select('*')
      .eq('username', username)
      .single(),

  getById: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('user_profiles_enhanced')
      .select('*')
      .eq('id', userId)
      .single(),

  /** Update profile */
  update: (supabase: TypedSupabaseClient, userId: string, data: {
    username?: string
    display_name?: string
    bio?: string
    avatar_url?: string
    cover_photo?: string
    pronouns?: string
    website?: string
    social_links?: Record<string, string>
    interests?: string[]
    skills?: string[]
    languages?: string[]
    is_private?: boolean
    show_activity?: boolean
    show_location?: boolean
  }) =>
    supabase
      .from('users')
      .update(data)
      .eq('id', userId)
      .select()
      .single(),

  /** Check username availability */
  checkUsername: async (supabase: TypedSupabaseClient, username: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    
    return { available: !data && !error, error }
  },
}

// ═══════════════════════════════════════════════════════════════════════
// FOLLOW QUERIES
// ═══════════════════════════════════════════════════════════════════════

export const followQueries = {
  /** Follow a user (or send request if private) */
  follow: async (supabase: TypedSupabaseClient, followingId: string, userId: string) => {
    // Check if target is private
    const { data: targetUser } = await supabase
      .from('users')
      .select('is_private')
      .eq('id', followingId)
      .single()
    
    if (targetUser?.is_private) {
      // Send follow request
      return supabase
        .from('follow_requests')
        .insert({
          requester_id: userId,
          target_id: followingId,
          status: 'pending',
        })
        .select()
        .single()
    } else {
      // Direct follow
      return supabase
        .from('follows')
        .insert({
          follower_id: userId,
          following_id: followingId,
        })
        .select()
        .single()
    }
  },

  /** Unfollow a user */
  unfollow: (supabase: TypedSupabaseClient, followingId: string, userId: string) =>
    supabase
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', followingId),

  /** Get followers */
  getFollowers: (supabase: TypedSupabaseClient, userId: string, requestingUserId: string, limit = 50, offset = 0) =>
    supabase.rpc('get_followers', {
      target_user_id: userId,
      requesting_user_id: requestingUserId,
      p_limit: limit,
      p_offset: offset,
    }),

  /** Get following */
  getFollowing: (supabase: TypedSupabaseClient, userId: string, requestingUserId: string, limit = 50, offset = 0) =>
    supabase.rpc('get_following', {
      target_user_id: userId,
      requesting_user_id: requestingUserId,
      p_limit: limit,
      p_offset: offset,
    }),

  /** Get follow requests (incoming) */
  getRequests: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('follow_requests')
      .select(`
        *,
        requester:users!requester_id(
          id, username, display_name, avatar_url, verified_at, verification_tier
        )
      `)
      .eq('target_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),

  /** Accept follow request */
  acceptRequest: (supabase: TypedSupabaseClient, requestId: string) =>
    supabase
      .from('follow_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .select()
      .single(),

  /** Decline follow request */
  declineRequest: (supabase: TypedSupabaseClient, requestId: string) =>
    supabase
      .from('follow_requests')
      .update({ status: 'declined' })
      .eq('id', requestId)
      .select()
      .single(),

  /** Get suggested users */
  getSuggested: (supabase: TypedSupabaseClient, userId: string, limit = 10) =>
    supabase.rpc('get_suggested_users', {
      for_user_id: userId,
      p_limit: limit,
    }),

  /** Check follow status */
  checkStatus: async (supabase: TypedSupabaseClient, userId: string, targetId: string) => {
    const [{ data: following }, { data: follower }, { data: request }] = await Promise.all([
      supabase
        .from('follows')
        .select('created_at')
        .eq('follower_id', userId)
        .eq('following_id', targetId)
        .maybeSingle(),
      supabase
        .from('follows')
        .select('created_at')
        .eq('follower_id', targetId)
        .eq('following_id', userId)
        .maybeSingle(),
      supabase
        .from('follow_requests')
        .select('status')
        .eq('requester_id', userId)
        .eq('target_id', targetId)
        .eq('status', 'pending')
        .maybeSingle(),
    ])
    
    return {
      is_following: !!following,
      is_follower: !!follower,
      is_mutual: !!following && !!follower,
      has_pending_request: !!request,
    }
  },
}

// ═══════════════════════════════════════════════════════════════════════
// POST QUERIES
// ═══════════════════════════════════════════════════════════════════════

export const postQueries = {
  /** Create post */
  create: (supabase: TypedSupabaseClient, data: {
    user_id: string
    type: PostType
    content?: string
    media_ids?: string[]
    location_name?: string
    location_point?: { lat: number; lng: number }
    activity_card_id?: string
    skill_swap_id?: string
    visibility?: PostVisibility
    tags?: string[]
    mentions?: string[]
  }) =>
    supabase
      .from('posts')
      .insert({
        ...data,
        location_point: data.location_point
          ? `POINT(${data.location_point.lng} ${data.location_point.lat})`
          : null,
      })
      .select()
      .single(),

  /** Get post by ID */
  getById: (supabase: TypedSupabaseClient, postId: string, userId?: string) =>
    supabase
      .from('posts')
      .select(`
        *,
        user:users!user_id(
          id, username, display_name, avatar_url, verified_at, verification_tier
        )
      `)
      .eq('id', postId)
      .single(),

  /** Get user feed */
  getFeed: (supabase: TypedSupabaseClient, userId: string, limit = 20, offset = 0) =>
    supabase.rpc('get_user_feed', {
      for_user_id: userId,
      p_limit: limit,
      p_offset: offset,
    }),

  /** Get user posts */
  getUserPosts: (supabase: TypedSupabaseClient, userId: string, limit = 20, offset = 0) =>
    supabase
      .from('posts')
      .select(`
        *,
        user:users!user_id(
          id, username, display_name, avatar_url, verified_at, verification_tier
        )
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1),

  /** Update post */
  update: (supabase: TypedSupabaseClient, postId: string, data: {
    content?: string
    visibility?: PostVisibility
    comments_disabled?: boolean
  }) =>
    supabase
      .from('posts')
      .update({ ...data, edited_at: new Date().toISOString() })
      .eq('id', postId)
      .select()
      .single(),

  /** Delete post (soft delete) */
  delete: (supabase: TypedSupabaseClient, postId: string) =>
    supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId),

  /** Get nearby posts */
  getNearby: (supabase: TypedSupabaseClient, lat: number, lng: number, radius = 5000, limit = 20) =>
    supabase
      .from('posts')
      .select(`
        *,
        user:users!user_id(
          id, username, display_name, avatar_url, verified_at, verification_tier
        )
      `)
      .not('location_point', 'is', null)
      .is('deleted_at', null)
      .eq('visibility', 'public')
      .limit(limit),

  /** Search posts */
  search: (supabase: TypedSupabaseClient, query: string, limit = 20) =>
    supabase
      .from('posts')
      .select(`
        *,
        user:users!user_id(
          id, username, display_name, avatar_url, verified_at, verification_tier
        )
      `)
      .or(`content.ilike.%${query}%,tags.cs.{${query}}`)
      .is('deleted_at', null)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit),
}

// ═══════════════════════════════════════════════════════════════════════
// REACTION QUERIES
// ═══════════════════════════════════════════════════════════════════════

export const reactionQueries = {
  /** Add reaction */
  add: (supabase: TypedSupabaseClient, postId: string, userId: string, reaction: ReactionType = 'like') =>
    supabase
      .from('post_reactions')
      .upsert({
        post_id: postId,
        user_id: userId,
        reaction_type: reaction,
      })
      .select()
      .single(),

  /** Remove reaction */
  remove: (supabase: TypedSupabaseClient, postId: string, userId: string) =>
    supabase
      .from('post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId),

  /** Get post reactions */
  getByPost: (supabase: TypedSupabaseClient, postId: string, limit = 100) =>
    supabase
      .from('post_reactions')
      .select(`
        *,
        user:users!user_id(
          id, username, display_name, avatar_url, verified_at
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(limit),
}

// ═══════════════════════════════════════════════════════════════════════
// COMMENT QUERIES
// ═══════════════════════════════════════════════════════════════════════

export const commentQueries = {
  /** Add comment */
  create: (supabase: TypedSupabaseClient, data: {
    post_id: string
    user_id: string
    content: string
    parent_comment_id?: string
    media_url?: string
  }) =>
    supabase
      .from('comments')
      .insert(data)
      .select(`
        *,
        user:users!user_id(
          id, username, display_name, avatar_url, verified_at
        )
      `)
      .single(),

  /** Get post comments */
  getByPost: (supabase: TypedSupabaseClient, postId: string, limit = 50) =>
    supabase
      .from('comments')
      .select(`
        *,
        user:users!user_id(
          id, username, display_name, avatar_url, verified_at
        )
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit),

  /** Get comment replies */
  getReplies: (supabase: TypedSupabaseClient, commentId: string) =>
    supabase
      .from('comments')
      .select(`
        *,
        user:users!user_id(
          id, username, display_name, avatar_url, verified_at
        )
      `)
      .eq('parent_comment_id', commentId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),

  /** Update comment */
  update: (supabase: TypedSupabaseClient, commentId: string, content: string) =>
    supabase
      .from('comments')
      .update({ content, edited_at: new Date().toISOString() })
      .eq('id', commentId)
      .select()
      .single(),

  /** Delete comment */
  delete: (supabase: TypedSupabaseClient, commentId: string) =>
    supabase
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId),

  /** Like comment */
  like: (supabase: TypedSupabaseClient, commentId: string, userId: string) =>
    supabase
      .from('comment_likes')
      .insert({ comment_id: commentId, user_id: userId })
      .select()
      .single(),

  /** Unlike comment */
  unlike: (supabase: TypedSupabaseClient, commentId: string, userId: string) =>
    supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId),
}

// ═══════════════════════════════════════════════════════════════════════
// SAVE/BOOKMARK QUERIES
// ═══════════════════════════════════════════════════════════════════════

export const savedPostQueries = {
  /** Save post */
  save: (supabase: TypedSupabaseClient, postId: string, userId: string, collection = 'default') =>
    supabase
      .from('saved_posts')
      .insert({
        post_id: postId,
        user_id: userId,
        collection_name: collection,
      })
      .select()
      .single(),

  /** Unsave post */
  unsave: (supabase: TypedSupabaseClient, postId: string, userId: string) =>
    supabase
      .from('saved_posts')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId),

  /** Get saved posts */
  getSaved: (supabase: TypedSupabaseClient, userId: string, collection = 'default', limit = 50) =>
    supabase
      .from('saved_posts')
      .select(`
        *,
        post:posts!post_id(
          *,
          user:users!user_id(
            id, username, display_name, avatar_url, verified_at
          )
        )
      `)
      .eq('user_id', userId)
      .eq('collection_name', collection)
      .order('created_at', { ascending: false })
      .limit(limit),

  /** Get collections */
  getCollections: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('saved_posts')
      .select('collection_name')
      .eq('user_id', userId)
      .order('collection_name'),
}
