/**
 * Query Handlers — T7 CQRS Read Side
 *
 * Each handler implements one query by delegating to the service layer.
 * Handlers return data directly (not { data, error } wrappers) to keep
 * the read side clean — errors bubble up as exceptions to the caller.
 */

import { FeedService } from '@/services/feed.service'
import { CardService } from '@/services/card.service'
import { FollowService } from '@/services/follow.service'
import { MessagingService } from '@/services/messaging.service'
import { queryBus } from '@/cqrs/query-bus'

// ─────────────────────────────────────────────────────────────────────────────
// Feed queries
// ─────────────────────────────────────────────────────────────────────────────

function registerFeedQueryHandlers() {
  queryBus.register('GET_FEED', async ({ payload }) => {
    const { data, error } = await FeedService.getFeed(payload.limit, payload.offset)
    if (error) throw error
    return (data ?? []) as Record<string, unknown>[]
  })

  queryBus.register('GET_POST', async ({ payload }) => {
    const { data, error } = await FeedService.getPost(payload.postId)
    if (error) throw error
    return (data ?? null) as Record<string, unknown> | null
  })

  queryBus.register('GET_POST_COMMENTS', async ({ payload }) => {
    const { data, error } = await FeedService.getComments(payload.postId, payload.limit)
    if (error) throw error
    return (data ?? []) as Record<string, unknown>[]
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Card queries
// ─────────────────────────────────────────────────────────────────────────────

function registerCardQueryHandlers() {
  queryBus.register('GET_NEARBY_CARDS', async ({ payload }) => {
    const { data, error } = await CardService.getCards({
      lat: payload.lat,
      lng: payload.lng,
      radiusKm: payload.radiusKm,
      category: payload.category,
      limit: payload.limit,
    })
    if (error) throw error
    return (data ?? []) as Record<string, unknown>[]
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Follow queries
// ─────────────────────────────────────────────────────────────────────────────

function registerFollowQueryHandlers() {
  queryBus.register('GET_FOLLOW_STATUS', async ({ payload }) => {
    return FollowService.getStatus(payload.viewerId, payload.targetId)
  })

  queryBus.register('GET_FOLLOWERS', async ({ payload }) => {
    const { data, error } = await FollowService.getFollowers(payload.userId, payload.limit)
    if (error) throw error
    return (data ?? []) as Record<string, unknown>[]
  })

  queryBus.register('GET_FOLLOWING', async ({ payload }) => {
    const { data, error } = await FollowService.getFollowing(payload.userId, payload.limit)
    if (error) throw error
    return (data ?? []) as Record<string, unknown>[]
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Messaging queries
// ─────────────────────────────────────────────────────────────────────────────

function registerMessagingQueryHandlers() {
  queryBus.register('GET_CONVERSATIONS', async () => {
    const { data, error } = await MessagingService.getConversations()
    if (error) throw error
    return (data ?? []) as Record<string, unknown>[]
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Public registration entry-point (called by setupCQRS)
// ─────────────────────────────────────────────────────────────────────────────

export function registerQueryHandlers(): void {
  registerFeedQueryHandlers()
  registerCardQueryHandlers()
  registerFollowQueryHandlers()
  registerMessagingQueryHandlers()
}
