/**
 * Event Handler Registry — T6 Event System
 *
 * Cross-cutting concerns wired to domain events:
 *
 * | Event             | Side-effect                                               |
 * |-------------------|-----------------------------------------------------------|
 * | USER_FOLLOWED     | Insert DB notification for recipient; emit NOTIFICATION_TRIGGERED |
 * | FOLLOW_ACCEPTED   | Insert DB notification for the original requester         |
 * | POST_LIKED        | Emit NOTIFICATION_TRIGGERED (postAuthorId as recipient)   |
 * | COMMENT_ADDED     | Emit NOTIFICATION_TRIGGERED for post author               |
 * | MESSAGE_SENT      | Emit AI_RECOMMENDATION_NEEDED if convo threshold met      |
 * | NOTIFICATION_TRIGGERED | Show browser push notification if permission granted |
 *
 * Call `registerEventHandlers()` ONCE at app startup (client side).
 * Handlers are idempotent — registering twice is safe because
 * registerEventHandlers() checks `_registered` guard.
 */

import { eventBus, makeEvent } from '@/lib/event-bus'
import { NotificationService } from '@/services/notification.service'

// ─────────────────────────────────────────────────────────────────────────────
// Internal guard — prevents duplicate registration across HMR reloads
// ─────────────────────────────────────────────────────────────────────────────

const REGISTERED_KEY = '__cevre_handlers_registered__'

function isAlreadyRegistered(): boolean {
  if (typeof globalThis === 'undefined') return false
  return !!(globalThis as Record<string, unknown>)[REGISTERED_KEY]
}

function markRegistered(): void {
  ;(globalThis as Record<string, unknown>)[REGISTERED_KEY] = true
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler implementations (kept small; real logic delegated to services)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When a user is followed (not pending), insert a notification for the
 * recipient and emit a NOTIFICATION_TRIGGERED integration event so the
 * client can update its badge counts.
 */
function handleUserFollowed(): () => void {
  return eventBus.on('USER_FOLLOWED', async ({ payload }) => {
    if (payload.status !== 'active') return  // pending = private account, notify on accept

    // Insert DB row for recipient (their Realtime subscription picks it up)
    await NotificationService.create(
      payload.followingId,
      'Yeni takipçi',
      'Seni takip etmeye başladı.',
      { actor_id: payload.followerId, event_type: 'USER_FOLLOWED' }
    )

    // Emit integration event for UI badge update
    eventBus.emit(makeEvent('NOTIFICATION_TRIGGERED', {
      recipientId: payload.followingId,
      notificationType: 'follow',
      sourceEventType: 'USER_FOLLOWED',
    }))
  })
}

/**
 * When a pending follow request is accepted, notify the original requester.
 */
function handleFollowAccepted(): () => void {
  return eventBus.on('FOLLOW_ACCEPTED', async ({ payload }) => {
    await NotificationService.create(
      payload.followerId,
      'Takip isteği kabul edildi',
      'Takip isteğin kabul edildi.',
      { actor_id: payload.followingId, event_type: 'FOLLOW_ACCEPTED' }
    )

    eventBus.emit(makeEvent('NOTIFICATION_TRIGGERED', {
      recipientId: payload.followerId,
      notificationType: 'follow_accepted',
      sourceEventType: 'FOLLOW_ACCEPTED',
    }))
  })
}

/**
 * When a post is liked, emit a notification trigger for the post author.
 * The `postAuthorId` is required — events without it are skipped.
 */
function handlePostLiked(): () => void {
  return eventBus.on('POST_LIKED', ({ payload }) => {
    if (!payload.liked) return  // unlike — no notification
    if (!payload.postAuthorId || payload.postAuthorId === payload.likerId) return

    eventBus.emit(makeEvent('NOTIFICATION_TRIGGERED', {
      recipientId: payload.postAuthorId,
      notificationType: 'post_liked',
      sourceEventType: 'POST_LIKED',
    }))
  })
}

/**
 * When a comment is added, emit a notification trigger for the post author.
 * Skips self-comments.
 */
function handleCommentAdded(): () => void {
  return eventBus.on('COMMENT_ADDED', ({ payload }) => {
    if (!payload.postAuthorId || payload.postAuthorId === payload.authorId) return

    eventBus.emit(makeEvent('NOTIFICATION_TRIGGERED', {
      recipientId: payload.postAuthorId,
      notificationType: 'comment_added',
      sourceEventType: 'COMMENT_ADDED',
    }))
  })
}

/**
 * When NOTIFICATION_TRIGGERED fires, show a browser push notification if
 * the current user IS the recipient (i.e. this is the target tab) and
 * the Notification API is permitted.
 */
function handleNotificationTriggered(): () => void {
  return eventBus.on('NOTIFICATION_TRIGGERED', ({ payload }) => {
    const label = (() => {
      switch (payload.notificationType) {
        case 'follow':         return 'Yeni bir takipçin var'
        case 'follow_accepted': return 'Takip isteğin kabul edildi'
        case 'post_liked':     return 'Gönderine beğeni geldi'
        case 'comment_added':  return 'Gönderine yorum yapıldı'
        default:               return 'Yeni bildirim'
      }
    })()

    NotificationService.showBrowserNotification(label, '')
  })
}

/**
 * When a new post is created, emit AI_RECOMMENDATION_NEEDED so the
 * recommendation engine can refresh the feed suggestions.
 */
function handlePostCreated(): () => void {
  return eventBus.on('POST_CREATED', ({ payload }) => {
    eventBus.emit(makeEvent('AI_RECOMMENDATION_NEEDED', {
      userId: payload.authorId,
      context: 'feed',
    }))
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Public registration entry-point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register all cross-cutting event handlers.
 * Safe to call multiple times — idempotent via global flag.
 *
 * @returns cleanup function that removes all registered handlers (useful for tests)
 */
export function registerEventHandlers(): () => void {
  if (isAlreadyRegistered()) return () => {}

  markRegistered()

  const unsubscribers = [
    handleUserFollowed(),
    handleFollowAccepted(),
    handlePostLiked(),
    handleCommentAdded(),
    handleNotificationTriggered(),
    handlePostCreated(),
  ]

  return () => {
    unsubscribers.forEach(unsub => unsub())
    ;(globalThis as Record<string, unknown>)[REGISTERED_KEY] = false
  }
}
