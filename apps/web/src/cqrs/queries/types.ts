/**
 * Query Type Catalog — T7 CQRS
 *
 * All read-side queries as a typed discriminated union.
 *
 * NOTE: SWR-backed hooks ARE the read-side projection for most data.
 *       QueryBus is used for imperative / non-hook read paths:
 *       server components, server actions, one-off fetches, and
 *       cross-domain queries that aggregate data from multiple services.
 */

import type { FollowStatus } from '@/services/follow.service'

// ─────────────────────────────────────────────────────────────────────────────
// Query definitions (read side)
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch paginated feed posts */
export type GetFeedQuery = {
  type: 'GET_FEED'
  payload: { limit?: number; offset?: number }
}

/** Fetch a single post by ID */
export type GetPostQuery = {
  type: 'GET_POST'
  payload: { postId: string }
}

/** Fetch comments for a post */
export type GetPostCommentsQuery = {
  type: 'GET_POST_COMMENTS'
  payload: { postId: string; limit?: number }
}

/** Fetch activity cards within a radius */
export type GetNearbyCardsQuery = {
  type: 'GET_NEARBY_CARDS'
  payload: { lat: number; lng: number; radiusKm?: number; category?: string; limit?: number }
}

/** Fetch the follow relationship between two users */
export type GetFollowStatusQuery = {
  type: 'GET_FOLLOW_STATUS'
  payload: { viewerId: string; targetId: string }
}

/** Fetch the follower list for a user */
export type GetFollowersQuery = {
  type: 'GET_FOLLOWERS'
  payload: { userId: string; limit?: number }
}

/** Fetch the following list for a user */
export type GetFollowingQuery = {
  type: 'GET_FOLLOWING'
  payload: { userId: string; limit?: number }
}

/** Fetch all conversations for the current user */
export type GetConversationsQuery = {
  type: 'GET_CONVERSATIONS'
  payload?: never
}

// ─────────────────────────────────────────────────────────────────────────────
// Discriminated union + helpers
// ─────────────────────────────────────────────────────────────────────────────

export type Query =
  | GetFeedQuery
  | GetPostQuery
  | GetPostCommentsQuery
  | GetNearbyCardsQuery
  | GetFollowStatusQuery
  | GetFollowersQuery
  | GetFollowingQuery
  | GetConversationsQuery

export type QueryType = Query['type']

// ─────────────────────────────────────────────────────────────────────────────
// Return type map
// ─────────────────────────────────────────────────────────────────────────────

export type QueryResultMap = {
  GET_FEED:           Record<string, unknown>[]
  GET_POST:           Record<string, unknown> | null
  GET_POST_COMMENTS:  Record<string, unknown>[]
  GET_NEARBY_CARDS:   Record<string, unknown>[]
  GET_FOLLOW_STATUS:  FollowStatus
  GET_FOLLOWERS:      Record<string, unknown>[]
  GET_FOLLOWING:      Record<string, unknown>[]
  GET_CONVERSATIONS:  Record<string, unknown>[]
}
