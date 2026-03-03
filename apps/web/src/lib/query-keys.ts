/**
 * T2 — Query Key Factory
 * Type-safe SWR cache key constants.
 * All data fetching hooks must use these keys for consistent cache invalidation.
 */

export const queryKeys = {
  // Auth
  session: () => ['auth', 'session'] as const,
  profile: (userId: string) => ['profile', userId] as const,

  // Cards
  nearbyCards: (lat: number, lng: number, category?: string) =>
    ['cards', 'nearby', lat, lng, category ?? 'all'] as const,
  card: (cardId: string) => ['card', cardId] as const,
  userCards: (userId: string) => ['cards', 'user', userId] as const,

  // Feed
  feed: (userId: string) => ['feed', userId] as const,
  post: (postId: string) => ['post', postId] as const,
  postComments: (postId: string) => ['post', postId, 'comments'] as const,

  // Messaging
  conversations: (userId: string) => ['conversations', userId] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
  unreadCount: (userId: string) => ['messaging', 'unread', userId] as const,

  // Notifications
  notifications: (userId: string) => ['notifications', userId] as const,
  unreadNotifications: (userId: string) => ['notifications', userId, 'unread'] as const,

  // Social
  followStatus: (viewerId: string, targetId: string) =>
    ['follow', 'status', viewerId, targetId] as const,
  followers: (userId: string) => ['follow', 'followers', userId] as const,
  following: (userId: string) => ['follow', 'following', userId] as const,

  // Neighborhoods
  neighborhoods: () => ['neighborhoods'] as const,
  neighborhood: (id: string) => ['neighborhood', id] as const,

  // Skill Swaps
  skillSwaps: () => ['skill-swaps'] as const,
  skillSwap: (id: string) => ['skill-swap', id] as const,

  // Recommendations
  recommendations: (userId: string) => ['recommendations', userId] as const,

  // Stories
  stories: (userId: string) => ['stories', userId] as const,
  storyFeed: (userId: string) => ['stories', 'feed', userId] as const,
} as const

export type QueryKey = ReturnType<(typeof queryKeys)[keyof typeof queryKeys]>
