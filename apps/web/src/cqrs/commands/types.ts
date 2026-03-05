/**
 * Command Type Catalog — T7 CQRS
 *
 * All write-side commands as a typed discriminated union.
 *
 * DESIGN PRINCIPLES:
 * - Each command carries the minimal payload needed to execute the intent
 * - Commands are plain value objects (no methods, no inheritance)
 * - Return types are collected in CommandResultMap for type-safe dispatch
 * - One handler per command type (registered in handlers.ts)
 */

import type { CreateStoryPayload } from '@/services/story.service'

// ─────────────────────────────────────────────────────────────────────────────
// Command definitions (write side)
// ─────────────────────────────────────────────────────────────────────────────

/** Publish a new post to the feed */
export type CreatePostCommand = {
  type: 'CREATE_POST'
  payload: {
    content: string
    media_url?: string[]
    post_type?: 'text' | 'image' | 'video' | 'activity'
    location?: { lat: number; lng: number }
    activity_card_id?: string
    visibility?: 'public' | 'followers' | 'private'
  }
}

/** Permanently delete the caller's post */
export type DeletePostCommand = {
  type: 'DELETE_POST'
  payload: { postId: string }
}

/** Toggle like / unlike on a post */
export type ToggleLikeCommand = {
  type: 'TOGGLE_LIKE'
  payload: { postId: string }
}

/** Add a comment (or reply) to a post */
export type AddCommentCommand = {
  type: 'ADD_COMMENT'
  payload: { postId: string; content: string; parentId?: string }
}

/** Follow another user */
export type FollowUserCommand = {
  type: 'FOLLOW_USER'
  payload: { targetId: string }
}

/** Unfollow a user the caller is currently following */
export type UnfollowUserCommand = {
  type: 'UNFOLLOW_USER'
  payload: { targetId: string }
}

/** Accept an incoming follow request */
export type AcceptFollowRequestCommand = {
  type: 'ACCEPT_FOLLOW_REQUEST'
  payload: { followerId: string }
}

/** Decline / delete an incoming follow request */
export type DeclineFollowRequestCommand = {
  type: 'DECLINE_FOLLOW_REQUEST'
  payload: { followerId: string }
}

/** Send a message in a conversation */
export type SendMessageCommand = {
  type: 'SEND_MESSAGE'
  payload: {
    conversationId: string
    content: string
    type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'activity_card' | 'story' | 'contact'
    mediaUrl?: string
    replyToId?: string
  }
}

/** Upload a new story */
export type CreateStoryCommand = {
  type: 'CREATE_STORY'
  payload: { userId: string; story: CreateStoryPayload }
}

/** Create a new activity card */
export type CreateCardCommand = {
  type: 'CREATE_CARD'
  payload: {
    title: string
    description: string
    category: string
    location: { lat: number; lng: number; address?: string }
    max_participants?: number
    scheduled_at?: string
    is_public?: boolean
    tags?: string[]
  }
}

/** Join an activity card */
export type JoinCardCommand = {
  type: 'JOIN_CARD'
  payload: { cardId: string }
}

/** Leave an activity card */
export type LeaveCardCommand = {
  type: 'LEAVE_CARD'
  payload: { cardId: string }
}

// ─────────────────────────────────────────────────────────────────────────────
// Discriminated union + helpers
// ─────────────────────────────────────────────────────────────────────────────

export type Command =
  | CreatePostCommand
  | DeletePostCommand
  | ToggleLikeCommand
  | AddCommentCommand
  | FollowUserCommand
  | UnfollowUserCommand
  | AcceptFollowRequestCommand
  | DeclineFollowRequestCommand
  | SendMessageCommand
  | CreateStoryCommand
  | CreateCardCommand
  | JoinCardCommand
  | LeaveCardCommand

export type CommandType = Command['type']

// ─────────────────────────────────────────────────────────────────────────────
// Return type map (used by CommandBus for type-safe dispatch)
// ─────────────────────────────────────────────────────────────────────────────

/** Maps each command type to the value its handler resolves with */
export type CommandResultMap = {
  CREATE_POST:             { data: Record<string, unknown> | null; error: Error | null }
  DELETE_POST:             { error: Error | null }
  TOGGLE_LIKE:             { liked: boolean; error: Error | null }
  ADD_COMMENT:             { data: Record<string, unknown> | null; error: Error | null }
  FOLLOW_USER:             { error: Error | null; status?: string }
  UNFOLLOW_USER:           { error: Error | null }
  ACCEPT_FOLLOW_REQUEST:   { error: Error | null }
  DECLINE_FOLLOW_REQUEST:  { error: Error | null }
  SEND_MESSAGE:            { data: Record<string, unknown> | null; error: Error | null }
  CREATE_STORY:            Record<string, unknown>
  CREATE_CARD:             { data: Record<string, unknown> | null; error: Error | null }
  JOIN_CARD:               { data: Record<string, unknown> | null; error: Error | null }
  LEAVE_CARD:              { error: Error | null }
}
