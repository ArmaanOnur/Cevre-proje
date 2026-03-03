-- =====================================================================
-- Çevre - Stories System (010)
-- 24-hour ephemeral content, stickers, highlights
-- =====================================================================

-- Story types
CREATE TYPE story_media_type AS ENUM ('image', 'video', 'text');
CREATE TYPE story_visibility AS ENUM ('public', 'followers', 'close_friends');

-- Stories tablosu
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type story_media_type NOT NULL,
  
  -- Media
  media_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 5, -- seconds (default 5 for images)
  
  -- Text story
  text_content TEXT,
  background_color VARCHAR(7) DEFAULT '#000000',
  background_gradient TEXT[],
  font_family VARCHAR(50) DEFAULT 'default',
  font_size INTEGER DEFAULT 24,
  text_align VARCHAR(20) DEFAULT 'center',
  
  -- Stickers (JSON array)
  stickers JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"type": "poll", "question": "...", "options": [...]}]
  -- Types: poll, question, location, mention, gif, emoji, music
  
  -- Music
  music_track_id TEXT,
  music_track_name TEXT,
  music_artist TEXT,
  music_start_time INTEGER DEFAULT 0,
  
  -- Engagement
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- Visibility
  visibility story_visibility DEFAULT 'followers',
  hide_from UUID[] DEFAULT ARRAY[]::UUID[],
  allow_replies BOOLEAN DEFAULT true,
  allow_shares BOOLEAN DEFAULT true,
  
  -- Expiry (24 hours)
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stories_user ON stories(user_id, created_at DESC) 
  WHERE deleted_at IS NULL AND expires_at > now();
CREATE INDEX idx_stories_expires ON stories(expires_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_stories_visibility ON stories(visibility);

-- Story views
CREATE TABLE story_views (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  view_duration INTEGER, -- seconds watched
  PRIMARY KEY (story_id, user_id)
);

CREATE INDEX idx_story_views_story ON story_views(story_id, viewed_at DESC);
CREATE INDEX idx_story_views_user ON story_views(user_id, viewed_at DESC);

-- Story replies (DM'e gider)
CREATE TABLE story_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_story_replies_story ON story_replies(story_id, created_at DESC);

-- Story highlights (kalıcı story koleksiyonları)
CREATE TABLE story_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  cover_story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  cover_image_url TEXT,
  
  -- Order
  position INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_story_highlights_user ON story_highlights(user_id, position);

-- Highlight stories (many-to-many)
CREATE TABLE highlight_stories (
  highlight_id UUID NOT NULL REFERENCES story_highlights(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (highlight_id, story_id)
);

CREATE INDEX idx_highlight_stories_highlight ON highlight_stories(highlight_id, position);

-- Close friends list
CREATE TABLE close_friends (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);

CREATE INDEX idx_close_friends_user ON close_friends(user_id);

-- RLS Policies
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_friends ENABLE ROW LEVEL SECURITY;

-- Stories: Visibility'ye göre
CREATE POLICY "stories_select_visible"
  ON stories FOR SELECT
  USING (
    deleted_at IS NULL 
    AND expires_at > now()
    AND (
      visibility = 'public'
      OR (visibility = 'followers' AND is_following(user_id, auth.uid()))
      OR (visibility = 'close_friends' AND EXISTS (
        SELECT 1 FROM close_friends WHERE user_id = stories.user_id AND friend_id = auth.uid()
      ))
      OR user_id = auth.uid()
    )
    AND NOT (auth.uid() = ANY(hide_from))
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

-- Story views: Herkes görebilir (story sahibi görebilir kim izlemiş)
CREATE POLICY "story_views_select_owner"
  ON story_views FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
  );

CREATE POLICY "story_views_insert_viewer"
  ON story_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Triggers

-- Trigger: Story view eklenince view_count artır
CREATE OR REPLACE FUNCTION increment_story_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE stories 
  SET view_count = view_count + 1 
  WHERE id = NEW.story_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_increment_story_view_count
  AFTER INSERT ON story_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_story_view_count();

-- Trigger: Story reply eklenince reply_count artır ve DM gönder
CREATE OR REPLACE FUNCTION handle_story_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_story_user_id UUID;
  v_conversation_id UUID;
BEGIN
  -- Story sahibini al
  SELECT user_id INTO v_story_user_id
  FROM stories WHERE id = NEW.story_id;
  
  -- Reply count artır
  UPDATE stories 
  SET reply_count = reply_count + 1 
  WHERE id = NEW.story_id;
  
  -- DM conversation oluştur/al
  v_conversation_id := get_or_create_direct_conversation(NEW.user_id, v_story_user_id);
  
  -- Message olarak ekle
  INSERT INTO messages (conversation_id, sender_id, type, content)
  VALUES (v_conversation_id, NEW.user_id, 'text', 
    '📖 Story''na yanıt: ' || NEW.content);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_handle_story_reply
  AFTER INSERT ON story_replies
  FOR EACH ROW
  EXECUTE FUNCTION handle_story_reply();

-- Helper Functions

-- Get active stories from following users
CREATE OR REPLACE FUNCTION get_stories_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR(30),
  display_name TEXT,
  avatar_url TEXT,
  story_count INTEGER,
  latest_story_at TIMESTAMPTZ,
  has_unseen BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH user_stories AS (
    SELECT 
      s.user_id,
      COUNT(*) as story_count,
      MAX(s.created_at) as latest_story_at,
      BOOL_OR(NOT EXISTS (
        SELECT 1 FROM story_views sv 
        WHERE sv.story_id = s.id AND sv.user_id = p_user_id
      )) as has_unseen
    FROM stories s
    WHERE s.deleted_at IS NULL
      AND s.expires_at > now()
      AND (
        (s.visibility = 'followers' AND is_following(p_user_id, s.user_id))
        OR (s.visibility = 'close_friends' AND EXISTS (
          SELECT 1 FROM close_friends WHERE user_id = s.user_id AND friend_id = p_user_id
        ))
      )
    GROUP BY s.user_id
  )
  SELECT 
    us.user_id,
    u.username,
    u.display_name,
    u.avatar_url,
    us.story_count::INTEGER,
    us.latest_story_at,
    us.has_unseen
  FROM user_stories us
  JOIN users u ON u.id = us.user_id
  ORDER BY us.has_unseen DESC, us.latest_story_at DESC
  LIMIT p_limit;
END;
$$;

-- Get user's active stories
CREATE OR REPLACE FUNCTION get_user_stories(
  p_user_id UUID,
  p_viewer_id UUID
)
RETURNS TABLE (
  id UUID,
  type story_media_type,
  media_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  text_content TEXT,
  stickers JSONB,
  view_count INTEGER,
  created_at TIMESTAMPTZ,
  has_viewed BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.type,
    s.media_url,
    s.thumbnail_url,
    s.duration,
    s.text_content,
    s.stickers,
    s.view_count,
    s.created_at,
    EXISTS (
      SELECT 1 FROM story_views sv 
      WHERE sv.story_id = s.id AND sv.user_id = p_viewer_id
    ) as has_viewed
  FROM stories s
  WHERE s.user_id = p_user_id
    AND s.deleted_at IS NULL
    AND s.expires_at > now()
  ORDER BY s.created_at ASC;
END;
$$;

-- Cleanup expired stories (scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE stories
  SET deleted_at = now()
  WHERE expires_at < now()
    AND deleted_at IS NULL;
END;
$$;

-- Update notification types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'story_reply';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'story_mention';
