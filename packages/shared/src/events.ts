/**
 * Domain Event Catalog — T6 Event System
 * Typed discriminated union of all domain & integration events.
 *
 * DESIGN PRINCIPLES:
 * - Each event is immutable (readonly fields)
 * - Events carry minimal context (IDs, not full objects)
 * - Consumers fetch full data via their own queries if needed
 * - Versioned via `schemaVersion` for future migrations
 */

// ─────────────────────────────────────────────────────────────────────────────
// Base
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseEvent {
  readonly id: string          // nanoid / crypto.randomUUID
  readonly occurredAt: string  // ISO-8601
  readonly schemaVersion: 1
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Events (write-side facts)
// ─────────────────────────────────────────────────────────────────────────────

/** A new post was published to the feed */
export interface PostCreatedEvent extends BaseEvent {
  readonly type: 'POST_CREATED'
  readonly payload: {
    readonly postId: string
    readonly authorId: string
    readonly postType: 'text' | 'image' | 'video' | 'activity'
    readonly visibility: 'public' | 'followers' | 'private'
  }
}

/** A post was permanently deleted */
export interface PostDeletedEvent extends BaseEvent {
  readonly type: 'POST_DELETED'
  readonly payload: {
    readonly postId: string
    readonly authorId: string
  }
}

/** A comment was added to a post */
export interface CommentAddedEvent extends BaseEvent {
  readonly type: 'COMMENT_ADDED'
  readonly payload: {
    readonly commentId: string
    readonly postId: string
    readonly authorId: string
    readonly postAuthorId: string
  }
}

/** A user liked/unliked a post */
export interface PostLikedEvent extends BaseEvent {
  readonly type: 'POST_LIKED'
  readonly payload: {
    readonly postId: string
    readonly postAuthorId: string
    readonly likerId: string
    readonly liked: boolean   // true=liked, false=unliked
  }
}

/** A new activity card was created */
export interface CardCreatedEvent extends BaseEvent {
  readonly type: 'CARD_CREATED'
  readonly payload: {
    readonly cardId: string
    readonly creatorId: string
    readonly category: string
    readonly lat: number
    readonly lng: number
  }
}

/** User A followed User B */
export interface UserFollowedEvent extends BaseEvent {
  readonly type: 'USER_FOLLOWED'
  readonly payload: {
    readonly followerId: string
    readonly followingId: string
    readonly status: 'active' | 'pending'  // pending = private account
  }
}

/** User A unfollowed User B */
export interface UserUnfollowedEvent extends BaseEvent {
  readonly type: 'USER_UNFOLLOWED'
  readonly payload: {
    readonly followerId: string
    readonly followingId: string
  }
}

/** A follow request was accepted */
export interface FollowAcceptedEvent extends BaseEvent {
  readonly type: 'FOLLOW_ACCEPTED'
  readonly payload: {
    readonly followerId: string
    readonly followingId: string
  }
}

/** A message was sent in a conversation */
export interface MessageSentEvent extends BaseEvent {
  readonly type: 'MESSAGE_SENT'
  readonly payload: {
    readonly messageId: string
    readonly conversationId: string
    readonly senderId: string
    readonly messageType: 'text' | 'image' | 'file' | 'voice'
  }
}

/** A story was uploaded */
export interface StoryUploadedEvent extends BaseEvent {
  readonly type: 'STORY_UPLOADED'
  readonly payload: {
    readonly storyId: string
    readonly authorId: string
    readonly mediaType: 'image' | 'video'
  }
}

/** User joined a neighborhood */
export interface NeighborhoodJoinedEvent extends BaseEvent {
  readonly type: 'NEIGHBORHOOD_JOINED'
  readonly payload: {
    readonly userId: string
    readonly neighborhoodId: string
    readonly role: string
  }
}

/** A skill swap was created */
export interface SkillSwapCreatedEvent extends BaseEvent {
  readonly type: 'SKILL_SWAP_CREATED'
  readonly payload: {
    readonly swapId: string
    readonly creatorId: string
    readonly offeredSkill: string
    readonly wantedSkill: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration Events (cross-boundary side-effects)
// ─────────────────────────────────────────────────────────────────────────────

/** Notification pipeline should be triggered */
export interface NotificationTriggeredEvent extends BaseEvent {
  readonly type: 'NOTIFICATION_TRIGGERED'
  readonly payload: {
    readonly recipientId: string
    readonly notificationType: string
    readonly referenceId: string
    readonly actorId: string
  }
}

/** AI recommendation pipeline needs refresh */
export interface AiRecommendationNeededEvent extends BaseEvent {
  readonly type: 'AI_RECOMMENDATION_NEEDED'
  readonly payload: {
    readonly userId: string
    readonly trigger: 'new_follow' | 'new_post' | 'location_change' | 'new_swap'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Union — the discriminated type used everywhere
// ─────────────────────────────────────────────────────────────────────────────

export type DomainEvent =
  | PostCreatedEvent
  | PostDeletedEvent
  | CommentAddedEvent
  | PostLikedEvent
  | CardCreatedEvent
  | UserFollowedEvent
  | UserUnfollowedEvent
  | FollowAcceptedEvent
  | MessageSentEvent
  | StoryUploadedEvent
  | NeighborhoodJoinedEvent
  | SkillSwapCreatedEvent
  | NotificationTriggeredEvent
  | AiRecommendationNeededEvent

/** Helper: extract the payload type for a given event type string */
export type EventPayload<T extends DomainEvent['type']> = Extract<DomainEvent, { type: T }>['payload']

/** All valid event type strings */
export type EventType = DomainEvent['type']
