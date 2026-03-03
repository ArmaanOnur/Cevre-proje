-- =====================================================================
-- Çevre - Feed & Posts System (007)
-- Social feed, posts, likes, comments, shares
-- =====================================================================

-- Post types
CREATE TYPE post_type AS ENUM ('text', 'image', 'video', 'poll', 'event', 'location', 'skill_swap');
CREATE TYPE post_visibility AS ENUM ('public', 'followers', 'close_friends', 'neighborhood');
CREATE TYPE reaction_type AS ENUM ('like', 'love', 'celebrate', 'support', 'insightful', 'curious');

-- Media tablosu
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'image', 'video', 'audio'
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- saniye (video/audio için)
  size_bytes INTEGER,
  mime_type VARCHAR(100),
  blurhash TEXT, -- Progressive loading için
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_media_user ON media(user_id);

-- Posts tablosu
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type post_type NOT NULL DEFAULT 'text',
  content TEXT,
  
  -- Medya
  media_ids UUID[], -- Media table references
  
  -- Location
  location_name TEXT,
  location_point GEOGRAPHY(POINT, 4326),
  
  -- Referanslar
  activity_card_id UUID REFERENCES activity_cards(id) ON DELETE SET NULL,
  skill_swap_id UUID REFERENCES skill_swaps(id) ON DELETE SET NULL,
  
  -- Engagement counts
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  
  -- Settings
  visibility post_visibility DEFAULT 'public',
  comments_disabled BOOLEAN DEFAULT false,
  
  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  mentions UUID[] DEFAULT ARRAY[]::UUID[], -- User IDs
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_posts_user ON posts(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_created ON posts(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_visibility ON posts(visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_location ON posts USING GIST(location_point) WHERE location_point IS NOT NULL;
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);

-- Post likes/reactions
CREATE TABLE post_reactions (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type reaction_type DEFAULT 'like',
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_post_reactions_user ON post_reactions(user_id, created_at DESC);
CREATE INDEX idx_post_reactions_post ON post_reactions(post_id, created_at DESC);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  media_url TEXT, -- Tek resim/GIF
  
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_user ON comments(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- Comment likes
CREATE TABLE comment_likes (
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

-- Shares/Reposts
CREATE TYPE share_type AS ENUM ('repost', 'quote', 'story', 'dm');

CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_type share_type NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shares_post ON shares(post_id, created_at DESC);
CREATE INDEX idx_shares_user ON shares(user_id, created_at DESC);

-- Saved posts (bookmarks)
CREATE TABLE saved_posts (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  collection_name VARCHAR(100) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_saved_posts_user ON saved_posts(user_id, collection_name, created_at DESC);

-- RLS Policies
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Posts: Visibility'ye göre
CREATE POLICY "posts_select_public"
  ON posts FOR SELECT
  USING (
    deleted_at IS NULL AND (
      visibility = 'public'
      OR (visibility = 'followers' AND is_following(user_id, auth.uid()))
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "posts_insert_own"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update_own"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "posts_delete_own"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- Reactions: Herkes görebilir, sadece kendisini ekleyebilir
CREATE POLICY "post_reactions_select_all"
  ON post_reactions FOR SELECT
  USING (true);

CREATE POLICY "post_reactions_insert_own"
  ON post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_reactions_delete_own"
  ON post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Comments: Post'u görebiliyorsa yorumu görebilir
CREATE POLICY "comments_select_if_can_see_post"
  ON comments FOR SELECT
  USING (
    deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = post_id 
      AND p.deleted_at IS NULL
      AND (
        p.visibility = 'public'
        OR (p.visibility = 'followers' AND is_following(p.user_id, auth.uid()))
        OR p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "comments_insert_own"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_update_own"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "comments_delete_own"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers

-- Post reaction eklenince/silinince like_count güncelle
CREATE OR REPLACE FUNCTION update_post_reaction_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    
    -- Bildirim gönder (kendi postuna like atarsa bildirme)
    IF NEW.user_id != (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
      PERFORM create_notification(
        (SELECT user_id FROM posts WHERE id = NEW.post_id),
        'post_liked',
        'Gönderini Beğendi',
        (SELECT display_name FROM users WHERE id = NEW.user_id) || ' gönderini beğendi',
        jsonb_build_object('post_id', NEW.post_id, 'user_id', NEW.user_id, 'reaction', NEW.reaction_type)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_post_reaction_count
  AFTER INSERT OR DELETE ON post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_post_reaction_count();

-- Comment eklenince/silinince comment_count güncelle
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    
    -- Parent comment varsa reply_count artır
    IF NEW.parent_comment_id IS NOT NULL THEN
      UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
    END IF;
    
    -- Bildirim gönder
    IF NEW.user_id != (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
      PERFORM create_notification(
        (SELECT user_id FROM posts WHERE id = NEW.post_id),
        'post_commented',
        'Yorum Yaptı',
        (SELECT display_name FROM users WHERE id = NEW.user_id) || ' gönderine yorum yaptı',
        jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id)
      );
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    
    IF OLD.parent_comment_id IS NOT NULL THEN
      UPDATE comments SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.parent_comment_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_post_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();

-- Share eklenince share_count artır
CREATE OR REPLACE FUNCTION update_post_share_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE posts SET share_count = share_count + 1 WHERE id = NEW.post_id;
  
  -- Bildirim gönder
  IF NEW.user_id != (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
    PERFORM create_notification(
      (SELECT user_id FROM posts WHERE id = NEW.post_id),
      'post_shared',
      'Gönderini Paylaştı',
      (SELECT display_name FROM users WHERE id = NEW.user_id) || ' gönderini paylaştı',
      jsonb_build_object('post_id', NEW.post_id, 'share_type', NEW.share_type)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_post_share_count
  AFTER INSERT ON shares
  FOR EACH ROW
  EXECUTE FUNCTION update_post_share_count();

-- Post oluşturulunca user post_count artır
CREATE OR REPLACE FUNCTION update_user_post_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE users SET post_count = post_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE users SET post_count = GREATEST(post_count - 1, 0) WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    UPDATE users SET post_count = post_count + 1 WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_user_post_count
  AFTER INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_post_count();

-- Feed generation function
CREATE OR REPLACE FUNCTION get_user_feed(
  for_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username VARCHAR(30),
  display_name TEXT,
  avatar_url TEXT,
  verified_at TIMESTAMPTZ,
  type post_type,
  content TEXT,
  media_ids UUID[],
  location_name TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  visibility post_visibility,
  created_at TIMESTAMPTZ,
  has_liked BOOLEAN,
  has_saved BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.verified_at,
    p.type,
    p.content,
    p.media_ids,
    p.location_name,
    p.like_count,
    p.comment_count,
    p.share_count,
    p.visibility,
    p.created_at,
    EXISTS (
      SELECT 1 FROM post_reactions pr 
      WHERE pr.post_id = p.id AND pr.user_id = for_user_id
    ) as has_liked,
    EXISTS (
      SELECT 1 FROM saved_posts sp 
      WHERE sp.post_id = p.id AND sp.user_id = for_user_id
    ) as has_saved
  FROM posts p
  JOIN users u ON u.id = p.user_id
  WHERE p.deleted_at IS NULL
    AND u.deleted_at IS NULL
    AND (
      -- Own posts
      p.user_id = for_user_id
      -- Following users' posts
      OR (p.visibility IN ('public', 'followers') AND is_following(for_user_id, p.user_id))
      -- Public posts
      OR p.visibility = 'public'
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Update notification types
ALTER TYPE notification_type ADD VALUE 'post_liked';
ALTER TYPE notification_type ADD VALUE 'post_commented';
ALTER TYPE notification_type ADD VALUE 'post_shared';
ALTER TYPE notification_type ADD VALUE 'post_mentioned';
