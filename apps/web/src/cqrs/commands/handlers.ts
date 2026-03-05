/**
 * Command Handlers — T7 CQRS Write Side
 *
 * Each handler implements one command by delegating to the service layer.
 * All 13 commands registered here; handlers are registered in cqrs/index.ts.
 *
 * HANDLER CONTRACT:
 *   - Receives the full typed command object
 *   - Must return exactly the type declared in CommandResultMap
 *   - Must NOT throw (return { error } instead for recoverable errors)
 *     Exception: CREATE_STORY follows StoryService convention (throws on error)
 */

import { FeedService } from '@/services/feed.service'
import { FollowService } from '@/services/follow.service'
import { MessagingService } from '@/services/messaging.service'
import { StoryService } from '@/services/story.service'
import { CardService } from '@/services/card.service'
import { commandBus } from '@/cqrs/command-bus'

// ─────────────────────────────────────────────────────────────────────────────
// Feed commands
// ─────────────────────────────────────────────────────────────────────────────

function registerFeedHandlers() {
  commandBus.register('CREATE_POST', async ({ payload }) => {
    const { data, error } = await FeedService.createPost(payload)
    return { data: data as Record<string, unknown> | null, error }
  })

  commandBus.register('DELETE_POST', async ({ payload }) => {
    const { error } = await FeedService.deletePost(payload.postId)
    return { error }
  })

  commandBus.register('TOGGLE_LIKE', async ({ payload }) => {
    const { liked, error } = await FeedService.toggleLike(payload.postId)
    return { liked, error }
  })

  commandBus.register('ADD_COMMENT', async ({ payload }) => {
    const { data, error } = await FeedService.addComment(
      payload.postId,
      payload.content,
      payload.parentId
    )
    return { data: data as Record<string, unknown> | null, error }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Social / follow commands
// ─────────────────────────────────────────────────────────────────────────────

function registerFollowHandlers() {
  commandBus.register('FOLLOW_USER', async ({ payload }) => {
    const { error, status } = await FollowService.follow(payload.targetId)
    return { error, status: status as string | undefined }
  })

  commandBus.register('UNFOLLOW_USER', async ({ payload }) => {
    const { error } = await FollowService.unfollow(payload.targetId)
    return { error }
  })

  commandBus.register('ACCEPT_FOLLOW_REQUEST', async ({ payload }) => {
    const { error } = await FollowService.acceptRequest(payload.followerId)
    return { error }
  })

  commandBus.register('DECLINE_FOLLOW_REQUEST', async ({ payload }) => {
    const { error } = await FollowService.declineRequest(payload.followerId)
    return { error }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Messaging commands
// ─────────────────────────────────────────────────────────────────────────────

function registerMessagingHandlers() {
  commandBus.register('SEND_MESSAGE', async ({ payload }) => {
    const { data, error } = await MessagingService.sendMessage(payload)
    return { data: data as Record<string, unknown> | null, error }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Story commands
// ─────────────────────────────────────────────────────────────────────────────

function registerStoryHandlers() {
  commandBus.register('CREATE_STORY', async ({ payload }) => {
    // StoryService.createStory throws on error (consistent with T4 design)
    const data = await StoryService.createStory(payload.userId, payload.story)
    return data as Record<string, unknown>
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Card commands
// ─────────────────────────────────────────────────────────────────────────────

function registerCardHandlers() {
  commandBus.register('CREATE_CARD', async ({ payload }) => {
    const { data, error } = await CardService.createCard(payload)
    return { data: data as Record<string, unknown> | null, error }
  })

  commandBus.register('JOIN_CARD', async ({ payload }) => {
    const { data, error } = await CardService.joinCard(payload.cardId)
    return { data: data as Record<string, unknown> | null, error }
  })

  commandBus.register('LEAVE_CARD', async ({ payload }) => {
    const { error } = await CardService.leaveCard(payload.cardId)
    return { error }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Public registration entry-point (called by setupCQRS)
// ─────────────────────────────────────────────────────────────────────────────

export function registerCommandHandlers(): void {
  registerFeedHandlers()
  registerFollowHandlers()
  registerMessagingHandlers()
  registerStoryHandlers()
  registerCardHandlers()
}
