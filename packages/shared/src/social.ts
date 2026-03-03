// packages/shared/src/social.ts

export type PostType = 'text' | 'image' | 'video' | 'poll' | 'event' | 'location' | 'skill_swap'
export type PostVisibility = 'public' | 'followers' | 'close_friends' | 'neighborhood'
export type ReactionType = 'like' | 'love' | 'celebrate' | 'support' | 'insightful' | 'curious'
export type ShareType = 'repost' | 'quote' | 'story' | 'dm'
export type VerificationTier = 'none' | 'verified' | 'professional' | 'business'

export interface EnhancedProfile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  cover_photo: string | null
  bio: string | null
  pronouns: string | null
  website: string | null
  social_links: {
    instagram?: string
    twitter?: string
    linkedin?: string
  }
  interests: string[]
  skills: string[]
  languages: string[]
  
  // Stats
  follower_count: number
  following_count: number
  post_count: number
  
  // Verification
  verified_at: string | null
  verification_tier: VerificationTier
  
  // Privacy
  is_private: boolean
  show_activity: boolean
  show_location: boolean
  
  // Computed
  profile_completeness?: number
  is_following?: boolean
  is_follower?: boolean
  is_mutual?: boolean
  
  created_at: string
}

export interface Post {
  id: string
  user_id: string
  type: PostType
  content: string | null
  
  // Media
  media_ids: string[]
  media?: Media[]
  
  // Location
  location_name: string | null
  location_point?: { lat: number; lng: number }
  
  // References
  activity_card_id?: string | null
  skill_swap_id?: string | null
  
  // Engagement
  like_count: number
  comment_count: number
  share_count: number
  view_count: number
  
  // Settings
  visibility: PostVisibility
  comments_disabled: boolean
  
  // Metadata
  tags: string[]
  mentions: string[]
  
  // User data (joined)
  user?: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    verified_at: string | null
    verification_tier: VerificationTier
  }
  
  // Current user interaction
  has_liked?: boolean
  has_saved?: boolean
  user_reaction?: ReactionType
  
  created_at: string
  updated_at: string
  edited_at: string | null
}

export interface Media {
  id: string
  type: 'image' | 'video' | 'audio'
  url: string
  thumbnail_url: string | null
  width: number | null
  height: number | null
  duration: number | null // seconds
  size_bytes: number | null
  blurhash: string | null
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_comment_id: string | null
  content: string
  media_url: string | null
  
  like_count: number
  reply_count: number
  
  // User data
  user?: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    verified_at: string | null
  }
  
  // Current user
  has_liked?: boolean
  
  // Nested replies
  replies?: Comment[]
  
  created_at: string
  edited_at: string | null
}

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
  notification_enabled: boolean
}

export interface FollowRequest {
  id: string
  requester_id: string
  target_id: string
  status: 'pending' | 'accepted' | 'declined'
  message: string | null
  created_at: string
  responded_at: string | null
  
  // User data
  requester?: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    verified_at: string | null
  }
}

// Helper functions

export function getReactionEmoji(reaction: ReactionType): string {
  const map: Record<ReactionType, string> = {
    like: '👍',
    love: '❤️',
    celebrate: '🎉',
    support: '🤝',
    insightful: '💡',
    curious: '🤔',
  }
  return map[reaction]
}

export function getReactionLabel(reaction: ReactionType): string {
  const map: Record<ReactionType, string> = {
    like: 'Beğen',
    love: 'Sev',
    celebrate: 'Kutla',
    support: 'Destek',
    insightful: 'İçgörülü',
    curious: 'Merak',
  }
  return map[reaction]
}

export function getVerificationBadge(tier: VerificationTier): {
  emoji: string
  color: string
  label: string
} | null {
  const map: Record<VerificationTier, { emoji: string; color: string; label: string } | null> = {
    none: null,
    verified: { emoji: '✓', color: '#1DA1F2', label: 'Doğrulanmış' },
    professional: { emoji: '⭐', color: '#F59E0B', label: 'Profesyonel' },
    business: { emoji: '🏢', color: '#8B5CF6', label: 'İşletme' },
  }
  return map[tier]
}

export function formatEngagementCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 10_000) return `${(count / 1000).toFixed(1)}K`
  if (count < 1_000_000) return `${Math.floor(count / 1000)}K`
  return `${(count / 1_000_000).toFixed(1)}M`
}

export function getPostTypeLabel(type: PostType): string {
  const map: Record<PostType, string> = {
    text: 'Metin',
    image: 'Fotoğraf',
    video: 'Video',
    poll: 'Anket',
    event: 'Etkinlik',
    location: 'Konum',
    skill_swap: 'Beceri Takası',
  }
  return map[type]
}

export function getPostTypeIcon(type: PostType): string {
  const map: Record<PostType, string> = {
    text: '📝',
    image: '🖼️',
    video: '🎥',
    poll: '📊',
    event: '🎯',
    location: '📍',
    skill_swap: '🤝',
  }
  return map[type]
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function extractHashtags(text: string): string[] {
  const regex = /#[\p{L}\p{N}_]+/gu
  const matches = text.match(regex)
  return matches ? matches.map(tag => tag.toLowerCase()) : []
}

export function extractMentions(text: string): string[] {
  const regex = /@[\p{L}\p{N}_]+/gu
  const matches = text.match(regex)
  return matches ? matches.map(mention => mention.substring(1).toLowerCase()) : []
}

export function linkifyText(text: string): string {
  // Convert URLs to links
  const urlRegex = /(https?:\/\/[^\s]+)/g
  let result = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>')
  
  // Convert hashtags to links
  const hashtagRegex = /#([\p{L}\p{N}_]+)/gu
  result = result.replace(hashtagRegex, '<a href="/explore/tags/$1">#$1</a>')
  
  // Convert mentions to links
  const mentionRegex = /@([\p{L}\p{N}_]+)/gu
  result = result.replace(mentionRegex, '<a href="/$1">@$1</a>')
  
  return result
}
