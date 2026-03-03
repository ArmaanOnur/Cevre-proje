# 📁 ÇEVRE - PROJE YAPISI (DETAYLI)

## 🎯 **ÖZET**

**Toplam:** 100+ dosya
**Toplam Satır:** ~60,000+ (tahmini)
**Database Tablosu:** 70+
**Hooks:** 17
**Queries:** 100+ CRUD işlem

---

## 📦 **ROOT YAPISHTML**

```
cevre-complete/
│
├── package.json                # Root workspace config
├── README.md                   # Ana kurulum rehberi (oku!)
├── PROJECT_STRUCTURE.md        # Bu dosya
│
├── apps/                       # Uygulamalar
│   ├── web/                    # Next.js Web App
│   └── mobile/                 # Expo Mobile App
│
└── packages/                   # Shared packages
    ├── shared/                 # Types, constants, utils
    └── supabase/               # Database, queries
```

---

## 🌐 **WEB APP (apps/web/)**

```
apps/web/
├── package.json                # Dependencies
├── next.config.js              # Next.js config
├── tsconfig.json               # TypeScript config
├── tailwind.config.js          # Tailwind CSS config
├── postcss.config.js           # PostCSS config
├── .env.example                # Environment template
│
└── src/
    ├── app/                    # App Router (Next.js 14)
    │   ├── layout.tsx          # Root layout
    │   ├── page.tsx            # Home page
    │   ├── globals.css         # Global styles
    │   │
    │   ├── auth/               # Auth pages
    │   │   ├── login/
    │   │   └── callback/
    │   │
    │   ├── harita/             # Map page
    │   ├── mahalleler/         # Neighborhoods
    │   ├── beceri/             # Skill swap
    │   ├── bildirimler/        # Notifications
    │   │
    │   ├── profil/             # Profile pages
    │   │   └── [username]/
    │   │
    │   ├── feed/               # Social feed
    │   ├── kesfet/             # Explore
    │   ├── hikayeler/          # Stories
    │   ├── reels/              # Reels
    │   ├── canli/              # Live streams
    │   ├── mesajlar/           # Messages
    │
    ├── components/             # React components
    │   ├── auth/
    │   │   ├── LoginForm.tsx
    │   │   └── OTPInput.tsx
    │   │
    │   ├── map/
    │   │   ├── MapView.tsx
    │   │   ├── CardMarker.tsx
    │   │   └── ClusterMarker.tsx
    │   │
    │   ├── cards/
    │   │   ├── CardList.tsx
    │   │   ├── CardDetail.tsx
    │   │   └── CreateCardModal.tsx
    │   │
    │   ├── social/
    │   │   ├── ProfileCard.tsx
    │   │   ├── FollowButton.tsx
    │   │   ├── PostCard.tsx
    │   │   ├── CommentSection.tsx
    │   │   └── ReactionButton.tsx
    │   │
    │   ├── stories/
    │   │   ├── StoriesBar.tsx
    │   │   ├── StoryViewer.tsx
    │   │   └── CreateStory.tsx
    │   │
    │   ├── messaging/
    │   │   ├── ChatList.tsx
    │   │   ├── ChatWindow.tsx
    │   │   └── MessageBubble.tsx
    │   │
    │   └── shared/
    │       ├── Header.tsx
    │       ├── Sidebar.tsx
    │       ├── LoadingSpinner.tsx
    │       └── ErrorBoundary.tsx
    │
    ├── hooks/                  # 17 Custom Hooks ✅
    │   ├── useAuth.ts          # Authentication
    │   ├── useProfile.ts       # Profile management
    │   ├── useFollow.ts        # Follow/unfollow
    │   ├── useFeed.ts          # Social feed
    │   ├── useStories.ts       # Stories
    │   ├── useReels.ts         # Reels (in useAdvanced)
    │   ├── useLiveStream.ts    # Live streaming (in useAdvanced)
    │   ├── useAchievements.ts  # Gamification (in useAdvanced)
    │   ├── useCards.ts         # Activity cards
    │   ├── useCardDetail.ts    # Card detail
    │   ├── useMap.ts           # Map interactions
    │   ├── useNeighborhoods.ts # Neighborhoods list
    │   ├── useNeighborhoodDetail.ts
    │   ├── useSkillSwaps.ts    # Skill swap list
    │   ├── useSkillSwapDetail.ts
    │   ├── useNotifications.ts # Notifications
    │   ├── useConversations.ts # Chat list
    │   ├── useMessages.ts      # Chat messages
    │   ├── useRecommendations.ts # AI recommendations
    │   └── useAdvanced.ts      # Combined advanced hooks
    │
    └── lib/                    # Utilities
        ├── supabase.ts         # Supabase client
        ├── mapbox.ts           # Mapbox config
        └── utils.ts            # Helper functions
```

---

## 📱 **MOBILE APP (apps/mobile/)**

```
apps/mobile/
├── package.json                # Dependencies
├── app.json                    # Expo config
├── tsconfig.json               # TypeScript config
├── babel.config.js             # Babel config
├── .env.example                # Environment template
│
└── src/
    ├── app/                    # Expo Router
    │   ├── _layout.tsx         # Root layout
    │   ├── index.tsx           # Home
    │   ├── (tabs)/             # Tab navigation
    │   │   ├── harita.tsx
    │   │   ├── kesfet.tsx
    │   │   ├── profil.tsx
    │   │   └── bildirimler.tsx
    │   │
    │   └── (modals)/           # Modal screens
    │       ├── login.tsx
    │       └── create-card.tsx
    │
    ├── components/             # React Native components
    │   ├── map/
    │   │   └── MapView.tsx     # React Native Maps
    │   │
    │   ├── cards/
    │   │   ├── CardList.tsx
    │   │   └── CardItem.tsx
    │   │
    │   └── shared/
    │       ├── Button.tsx
    │       └── Input.tsx
    │
    ├── hooks/                  # Same hooks (reused from web)
    │
    └── lib/
        └── supabase.ts         # Supabase client (mobile)
```

---

## 📦 **SHARED PACKAGE (packages/shared/)**

```
packages/shared/
├── package.json
├── tsconfig.json
│
└── src/
    ├── index.ts                # Main export
    │
    ├── constants.ts            # App constants
    │   # - ACTIVITY_CATEGORIES
    │   # - CARD_STATUSES
    │   # - SKILL_CATEGORIES
    │   # - etc.
    │
    ├── types/                  # TypeScript types
    │   ├── auth.ts             # User, Profile
    │   ├── cards.ts            # ActivityCard
    │   ├── neighborhoods.ts    # Neighborhood
    │   ├── skill-swap.ts       # SkillSwap
    │   ├── notifications.ts    # Notification
    │   ├── social.ts           # Post, Comment, Follow
    │   ├── messaging.ts        # Conversation, Message
    │   └── index.ts
    │
    ├── utils.ts                # Helper functions
    │   # - formatDistance
    │   # - timeAgo
    │   # - getInitials
    │   # - etc.
    │
    └── validation.ts           # Zod schemas
        # - phoneSchema
        # - postSchema
        # - profileSchema
        # - etc.
```

---

## 🗄️ **SUPABASE PACKAGE (packages/supabase/)**

```
packages/supabase/
├── package.json
├── tsconfig.json
│
├── migrations/                 # 15 SQL Migration Files ✅
│   ├── 001_initial_schema.sql          # Users, cards, neighborhoods
│   ├── 002_storage.sql                 # Storage buckets
│   ├── 003_postgis_helpers.sql         # PostGIS functions
│   ├── 004_notifications.sql           # Notification system
│   ├── 005_enhanced_profiles.sql       # Username, social links
│   ├── 006_follow_system.sql           # Follow/unfollow
│   ├── 007_feed_posts.sql              # Posts, reactions, comments
│   ├── 008_messaging.sql               # DM, group chat
│   ├── 009_calls.sql                   # Voice/video calls
│   ├── 010_stories.sql                 # 24h stories
│   ├── 011_reels.sql                   # Short videos
│   ├── 012_live_streaming.sql          # Live streams
│   ├── 013_explore_ai.sql              # Search, trending
│   ├── 014_gamification.sql            # Achievements, points
│   └── 015_business_moderation_monetization.sql # Business features
│
└── src/
    ├── index.ts                # Main export
    │
    ├── client.ts               # Supabase client factory
    ├── database.types.ts       # Auto-generated types
    │
    ├── queries.ts              # Base queries (CRUD)
    │   # - getById
    │   # - create
    │   # - update
    │   # - delete
    │   # - list
    │
    ├── card-detail-queries.ts  # Activity cards
    │   # - cardDetailQueries.get()
    │   # - cardDetailQueries.join()
    │   # - cardDetailQueries.acceptJoin()
    │   # - etc.
    │
    ├── neighborhood-queries.ts # Neighborhoods
    │   # - neighborhoodQueries.list()
    │   # - neighborhoodQueries.join()
    │   # - etc.
    │
    ├── skill-swap-queries.ts   # Skill swap
    │   # - skillSwapQueries.create()
    │   # - skillSwapQueries.match()
    │   # - etc.
    │
    ├── notification-queries.ts # Notifications
    │   # - notificationQueries.getAll()
    │   # - notificationQueries.markAsRead()
    │   # - etc.
    │
    ├── social-queries.ts       # Social features
    │   # - profileQueries
    │   # - followQueries
    │   # - postQueries
    │   # - reactionQueries
    │   # - commentQueries
    │   # - savedPostQueries
    │
    ├── messaging-queries.ts    # Messaging
    │   # - conversationQueries
    │   # - messageQueries
    │   # - callQueries
    │
    └── ai-recommendation-queries.ts  # ML recommendations
```

---

## 🗄️ **DATABASE SCHEMA (70+ Tables)**

### **Base Tables (001-004):**
- `users` - User profiles
- `activity_cards` - Events/activities
- `card_joins` - Join requests
- `neighborhoods` - Communities
- `neighborhood_members` - Membership
- `skill_swaps` - P2P learning
- `skill_matches` - Matches
- `notifications` - Notifications
- `push_tokens` - Push tokens
- `safety_logs` - Safety pings

### **Social Tables (005-007):**
- `follows` - Follow relationships
- `follow_requests` - Private account requests
- `posts` - Social posts
- `post_reactions` - Likes, loves, etc.
- `comments` - Post comments
- `comment_likes` - Comment likes
- `shares` - Reposts
- `saved_posts` - Bookmarks
- `media` - Media files

### **Messaging Tables (008-009):**
- `conversations` - Chat rooms
- `conversation_participants` - Members
- `messages` - Messages
- `message_reads` - Read receipts
- `typing_indicators` - Typing status
- `calls` - Voice/video calls
- `call_participants` - Call members

### **Media Tables (010-012):**
- `stories` - 24h stories
- `story_views` - Views
- `story_replies` - Replies
- `story_highlights` - Highlights
- `highlight_stories` - Many-to-many
- `close_friends` - Close friends list
- `reels` - Short videos
- `reel_views` - Views
- `reel_likes` - Likes
- `live_streams` - Live streams
- `live_viewers` - Viewers
- `live_comments` - Chat
- `live_gifts` - Virtual gifts

### **Advanced Tables (013-015):**
- `search_history` - Search logs
- `trending_topics` - Trending
- `user_interests` - ML data
- `user_interactions` - ML training
- `recommendations` - AI cache
- `achievements` - Badges
- `user_achievements` - Unlocked
- `user_points` - Points & levels
- `leaderboards` - Rankings
- `leaderboard_entries` - Scores
- `business_profiles` - Business accounts
- `reports` - Content reports
- `user_blocks` - Blocked users
- `user_mutes` - Muted users
- `banned_users` - Banned
- `subscription_plans` - Plans
- `subscriptions` - User subscriptions
- `ad_campaigns` - Ads
- `virtual_gifts` - Gift catalog
- `gift_transactions` - Purchases

---

## 📊 **DOSYA İSTATİSTİKLERİ**

| Kategori | Dosya Sayısı | Satır (Tahmini) |
|----------|--------------|-----------------|
| **Migrations** | 15 | 5,000 |
| **Shared Types** | 15 | 3,000 |
| **Queries** | 10 | 8,000 |
| **Hooks** | 17 | 5,000 |
| **Web Components** | 50+ | 20,000 |
| **Mobile Components** | 30+ | 10,000 |
| **Config Files** | 20+ | 500 |
| **README/Docs** | 10+ | 5,000 |
| **TOPLAM** | **167+** | **~56,500** |

---

## 🔧 **CONFIGURATION FILES**

### **Root:**
- `package.json` - Workspace config
- `.gitignore` - Git ignore rules

### **Web:**
- `next.config.js` - Next.js config
- `tailwind.config.js` - Tailwind CSS
- `tsconfig.json` - TypeScript
- `postcss.config.js` - PostCSS
- `.env.example` - Environment template

### **Mobile:**
- `app.json` - Expo config
- `babel.config.js` - Babel
- `tsconfig.json` - TypeScript
- `.env.example` - Environment template

### **Packages:**
- Each package has its own `package.json` and `tsconfig.json`

---

## 🚀 **KULLANIM ÖRNEKLERİ**

### **Import Örnekleri:**

```typescript
// Shared types
import { ActivityCard, User } from '@cevre/shared'

// Supabase queries
import { cardDetailQueries } from '@cevre/supabase'

// Hooks
import { useAuth } from '@/hooks/useAuth'
import { useCards } from '@/hooks/useCards'

// Components
import { CardList } from '@/components/cards/CardList'
```

### **Hook Kullanımı:**

```typescript
function HomePage() {
  const { user } = useAuth()
  const { cards, isLoading } = useCards()
  const { posts } = useFeed()
  
  return (
    <div>
      <CardList cards={cards} />
      <FeedList posts={posts} />
    </div>
  )
}
```

---

## 📖 **DAHA FAZLA BİLGİ**

Her özellik için detaylı README:
- `FAZ1_SOCIAL_README.md` - Follow, Feed, Posts
- `FAZ2_MESSAGING_README.md` - DM, Calls
- `FAZ3_MEDIA_README.md` - Stories, Reels, Live
- `FAZ4-8_COMBINED_README.md` - Advanced features

---

**Proje yapısı tam ve eksiksiz!** 🎉

Her dosyanın yerini biliyorsun artık. İyi kodlamalar! 💻✨
