/**
 * FollowService — T2 Service Layer
 * Wraps all follow/social-graph Supabase operations.
 */

import { createClient } from '@/lib/supabase'
import { eventBus, makeEvent } from '@/lib/event-bus'

export interface FollowStatus {
  is_following: boolean
  is_follower: boolean
  is_mutual: boolean
  has_pending_request: boolean
}

export class FollowService {
  private static get db() {
    return createClient()
  }

  /** Get follow relationship status between two users */
  static async getStatus(viewerId: string, targetId: string): Promise<FollowStatus> {
    if (viewerId === targetId) {
      return { is_following: false, is_follower: false, is_mutual: false, has_pending_request: false }
    }

    const { data } = await this.db
      .from('follows')
      .select('follower_id, following_id, status')
      .or(
        `and(follower_id.eq.${viewerId},following_id.eq.${targetId}),` +
        `and(follower_id.eq.${targetId},following_id.eq.${viewerId})`
      )

    const rows = data ?? []
    const outgoing = rows.find(r => r.follower_id === viewerId && r.following_id === targetId)
    const incoming = rows.find(r => r.follower_id === targetId && r.following_id === viewerId)

    const is_following = outgoing?.status === 'active'
    const is_follower = incoming?.status === 'active'

    return {
      is_following,
      is_follower,
      is_mutual: is_following && is_follower,
      has_pending_request: outgoing?.status === 'pending',
    }
  }

  /** Follow a user */
  static async follow(targetId: string) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }

    // Check if target profile is private
    const { data: target } = await db
      .from('users')
      .select('is_private')
      .eq('id', targetId)
      .single()

    const status = target?.is_private ? 'pending' : 'active'

    const { error } = await db
      .from('follows')
      .upsert({ follower_id: user.id, following_id: targetId, status })
    if (!error) {
      eventBus.emit(makeEvent('USER_FOLLOWED', {
        followerId: user.id,
        followingId: targetId,
        status: status as 'active' | 'pending',
      }))
    }
    return { error, status }
  }

  /** Unfollow a user */
  static async unfollow(targetId: string) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }

    const { error } = await db
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetId)
    if (!error) {
      eventBus.emit(makeEvent('USER_UNFOLLOWED', { followerId: user.id, followingId: targetId }))
    }
    return { error }
  }

  /** Accept a follow request */
  static async acceptRequest(followerId: string) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }

    const { error } = await db
      .from('follows')
      .update({ status: 'active' })
      .eq('follower_id', followerId)
      .eq('following_id', user.id)
      .eq('status', 'pending')
    if (!error) {
      eventBus.emit(makeEvent('FOLLOW_ACCEPTED', { followerId, followingId: user.id }))
    }
    return { error }
  }

  /** Decline a follow request */
  static async declineRequest(followerId: string) {
    const db = this.db
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }

    const { error } = await db
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', user.id)
      .eq('status', 'pending')
    return { error }
  }

  /** Get followers list */
  static async getFollowers(userId: string, limit = 50) {
    const { data, error } = await this.db
      .from('follows')
      .select(`
        follower_id,
        status,
        created_at,
        follower:users!follower_id(id, username, full_name, avatar_url, is_verified)
      `)
      .eq('following_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  }

  /** Get following list */
  static async getFollowing(userId: string, limit = 50) {
    const { data, error } = await this.db
      .from('follows')
      .select(`
        following_id,
        status,
        created_at,
        following:users!following_id(id, username, full_name, avatar_url, is_verified)
      `)
      .eq('follower_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  }

  /** Get pending follow requests (for private accounts) */
  static async getPendingRequests(userId: string) {
    const { data, error } = await this.db
      .from('follows')
      .select(`
        follower_id,
        created_at,
        follower:users!follower_id(id, username, full_name, avatar_url)
      `)
      .eq('following_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    return { data, error }
  }
}
