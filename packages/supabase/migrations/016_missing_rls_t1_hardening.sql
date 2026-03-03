-- =====================================================================
-- Çevre - Missing RLS Policies (016)
-- T0 Structural Audit: 23 tables without confirmed RLS
-- Phase T1 — Security Hardening
-- =====================================================================

-- ─── MESSAGING DOMAIN ────────────────────────────────────────────────────────
-- CRITICAL: conversations and messages were missing RLS → cross-user leak risk

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- conversations: Only participants can see the conversation
CREATE POLICY "conversations_select_participant"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

CREATE POLICY "conversations_insert_auth"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "conversations_update_participant"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = id
        AND cp.user_id = auth.uid()
        AND cp.role = 'admin'
    )
  );

-- conversation_participants: Can see own participation + same conversation peers
CREATE POLICY "conv_participants_select"
  ON conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "conv_participants_insert_own"
  ON conversation_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conv_participants_update_own"
  ON conversation_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- messages: Only conversation participants can read messages
CREATE POLICY "messages_select_participant"
  ON messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
    -- "delete for me" check
    AND (
      deleted_for IS NULL
      OR NOT (auth.uid() = ANY(deleted_for))
    )
  );

CREATE POLICY "messages_insert_participant"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

CREATE POLICY "messages_update_own"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- message_reads: Can only insert own reads, see reads in own conversations
CREATE POLICY "message_reads_select"
  ON message_reads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "message_reads_insert_own"
  ON message_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- typing_indicators: Conversation participants only
CREATE POLICY "typing_select_participant"
  ON typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = typing_indicators.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

CREATE POLICY "typing_insert_own"
  ON typing_indicators FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "typing_delete_own"
  ON typing_indicators FOR DELETE
  USING (auth.uid() = user_id);

-- ─── MEDIA DOMAIN ────────────────────────────────────────────────────────────

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

-- stories: Visibility-based access
CREATE POLICY "stories_select_visibility"
  ON stories FOR SELECT
  USING (
    deleted_at IS NULL
    AND expires_at > now()
    AND (
      -- Own stories always visible
      user_id = auth.uid()
      -- Public stories
      OR visibility = 'public'
      -- Followers-only
      OR (visibility = 'followers' AND is_following(user_id, auth.uid()))
      -- Close friends (placeholder — requires close_friends table join)
      OR (visibility = 'close_friends' AND user_id = auth.uid())
    )
    -- Not hidden from viewer
    AND (
      hide_from IS NULL
      OR NOT (auth.uid() = ANY(hide_from))
    )
  );

CREATE POLICY "stories_insert_own"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stories_update_own"
  ON stories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "stories_delete_own"
  ON stories FOR DELETE
  USING (auth.uid() = user_id);

-- story_views: Can insert own views, story owner can see who viewed
CREATE POLICY "story_views_select"
  ON story_views FOR SELECT
  USING (
    user_id = auth.uid()
    OR story_id IN (SELECT id FROM stories WHERE user_id = auth.uid())
  );

CREATE POLICY "story_views_insert_own"
  ON story_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- story_replies: Sender and story owner
CREATE POLICY "story_replies_select"
  ON story_replies FOR SELECT
  USING (
    user_id = auth.uid()
    OR story_id IN (SELECT id FROM stories WHERE user_id = auth.uid())
  );

CREATE POLICY "story_replies_insert_own"
  ON story_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- reel_views
CREATE POLICY "reel_views_insert_own"
  ON reel_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reel_views_select_own"
  ON reel_views FOR SELECT
  USING (user_id = auth.uid());

-- reel_likes
CREATE POLICY "reel_likes_select_all"
  ON reel_likes FOR SELECT
  USING (true);

CREATE POLICY "reel_likes_insert_own"
  ON reel_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reel_likes_delete_own"
  ON reel_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ─── MODERATION DOMAIN ───────────────────────────────────────────────────────

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;

-- user_blocks: Only the blocker can see/manage their blocks
CREATE POLICY "user_blocks_select_own"
  ON user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "user_blocks_insert_own"
  ON user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "user_blocks_delete_own"
  ON user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- user_mutes: Only the muter can see/manage their mutes
CREATE POLICY "user_mutes_select_own"
  ON user_mutes FOR SELECT
  USING (auth.uid() = muter_id);

CREATE POLICY "user_mutes_insert_own"
  ON user_mutes FOR INSERT
  WITH CHECK (auth.uid() = muter_id);

CREATE POLICY "user_mutes_delete_own"
  ON user_mutes FOR DELETE
  USING (auth.uid() = muter_id);

-- banned_users: Users can see their own ban status; admins handled via service role
CREATE POLICY "banned_users_select_own"
  ON banned_users FOR SELECT
  USING (auth.uid() = user_id);

-- ─── GAMIFICATION DOMAIN ─────────────────────────────────────────────────────

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Public gamification data (achievements are public like badges)
CREATE POLICY "user_achievements_select_all"
  ON user_achievements FOR SELECT
  USING (true);

CREATE POLICY "user_points_select_all"
  ON user_points FOR SELECT
  USING (true);

CREATE POLICY "user_points_update_own"
  ON user_points FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "leaderboard_entries_select_all"
  ON leaderboard_entries FOR SELECT
  USING (true);

-- ─── AI/ML DOMAIN ─────────────────────────────────────────────────────────────

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- user_interests: Own data only
CREATE POLICY "user_interests_own"
  ON user_interests FOR ALL
  USING (auth.uid() = user_id);

-- recommendations: Own recommendations only
CREATE POLICY "recommendations_select_own"
  ON recommendations FOR SELECT
  USING (auth.uid() = user_id);

-- ─── MISSING FEED DOMAIN RLS ─────────────────────────────────────────────────

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- comment_likes: Public visibility, own management
CREATE POLICY "comment_likes_select_all"
  ON comment_likes FOR SELECT
  USING (true);

CREATE POLICY "comment_likes_insert_own"
  ON comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comment_likes_delete_own"
  ON comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- shares: Public reshares
CREATE POLICY "shares_select_all"
  ON shares FOR SELECT
  USING (true);

CREATE POLICY "shares_insert_own"
  ON shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── LIVE STREAMING ──────────────────────────────────────────────────────────

ALTER TABLE live_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_viewers_select_all"
  ON live_viewers FOR SELECT
  USING (true);

CREATE POLICY "live_viewers_insert_own"
  ON live_viewers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "live_comments_select_all"
  ON live_comments FOR SELECT
  USING (true);

CREATE POLICY "live_comments_insert_own"
  ON live_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "live_gifts_select_own"
  ON live_gifts FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "live_gifts_insert_own"
  ON live_gifts FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- ─── MEDIA STORAGE BUCKETS ──────────────────────────────────────────────────
-- Extend storage policies beyond avatars

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('posts', 'posts', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('videos', 'videos', true, 524288000, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
  ('stories', 'stories', true, 104857600, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']),
  ('audio', 'audio', false, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'])
ON CONFLICT (id) DO NOTHING;

-- Posts media: own upload, public read
CREATE POLICY "posts_media_select" ON storage.objects FOR SELECT USING (bucket_id = 'posts');
CREATE POLICY "posts_media_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "posts_media_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Videos: own upload, public read
CREATE POLICY "videos_select" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "videos_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Stories: own upload, public read
CREATE POLICY "stories_media_select" ON storage.objects FOR SELECT USING (bucket_id = 'stories');
CREATE POLICY "stories_media_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
