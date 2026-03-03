-- =====================================================================
-- Çevre - Follow System (006)
-- Takip sistemi, follow requests, mutual follows
-- =====================================================================

-- Follow request statuses
CREATE TYPE follow_request_status AS ENUM ('pending', 'accepted', 'declined');

-- Follows tablosu
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  notification_enabled BOOLEAN DEFAULT true,
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_follows_created ON follows(created_at DESC);

-- Follow requests (private hesaplar için)
CREATE TABLE follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status follow_request_status DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(requester_id, target_id),
  CONSTRAINT no_self_request CHECK (requester_id != target_id)
);

CREATE INDEX idx_follow_requests_target ON follow_requests(target_id, status);
CREATE INDEX idx_follow_requests_requester ON follow_requests(requester_id);

-- RLS Policies
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;

-- Follows: Herkes görebilir (public profiles için)
CREATE POLICY "follows_select_all"
  ON follows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = following_id 
      AND (is_private = false OR auth.uid() = follower_id OR auth.uid() = following_id)
    )
  );

CREATE POLICY "follows_insert_own"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_own"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Follow requests: Sadece ilgililer görebilir
CREATE POLICY "follow_requests_select_related"
  ON follow_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

CREATE POLICY "follow_requests_insert_own"
  ON follow_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "follow_requests_update_target"
  ON follow_requests FOR UPDATE
  USING (auth.uid() = target_id);

-- Trigger: Follow eklenince counter'ları güncelle
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Follower'ın following_count'unu artır
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    -- Following'in follower_count'unu artır
    UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    
    -- Bildirim gönder
    PERFORM create_notification(
      NEW.following_id,
      'new_follower',
      'Yeni Takipçi',
      (SELECT display_name FROM users WHERE id = NEW.follower_id) || ' seni takip etmeye başladı',
      jsonb_build_object('follower_id', NEW.follower_id)
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Counters'ı azalt
    UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE users SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.following_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_counts();

-- Trigger: Follow request kabul edilince follow ekle
CREATE OR REPLACE FUNCTION process_follow_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Follow ekle
    INSERT INTO follows (follower_id, following_id)
    VALUES (NEW.requester_id, NEW.target_id)
    ON CONFLICT DO NOTHING;
    
    -- responded_at güncelle
    NEW.responded_at := now();
    
    -- Bildirim gönder
    PERFORM create_notification(
      NEW.requester_id,
      'follow_request_accepted',
      'Takip İsteğin Kabul Edildi',
      (SELECT display_name FROM users WHERE id = NEW.target_id) || ' takip isteğini kabul etti',
      jsonb_build_object('user_id', NEW.target_id)
    );
  ELSIF NEW.status = 'declined' AND OLD.status = 'pending' THEN
    NEW.responded_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_process_follow_request
  BEFORE UPDATE ON follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_follow_request();

-- Helper functions

-- Check if user1 follows user2
CREATE OR REPLACE FUNCTION is_following(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows 
    WHERE follower_id = user1_id AND following_id = user2_id
  );
$$;

-- Check if mutual follow
CREATE OR REPLACE FUNCTION is_mutual_follow(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows 
    WHERE follower_id = user1_id AND following_id = user2_id
  ) AND EXISTS (
    SELECT 1 FROM follows 
    WHERE follower_id = user2_id AND following_id = user1_id
  );
$$;

-- Get follower list with mutual status
CREATE OR REPLACE FUNCTION get_followers(
  target_user_id UUID,
  requesting_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username VARCHAR(30),
  display_name TEXT,
  avatar_url TEXT,
  verified_at TIMESTAMPTZ,
  verification_tier verification_tier,
  is_following BOOLEAN,
  is_mutual BOOLEAN,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.verified_at,
    u.verification_tier,
    is_following(requesting_user_id, u.id) as is_following,
    is_mutual_follow(requesting_user_id, u.id) as is_mutual,
    f.created_at as followed_at
  FROM follows f
  JOIN users u ON u.id = f.follower_id
  WHERE f.following_id = target_user_id
    AND u.deleted_at IS NULL
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Get following list
CREATE OR REPLACE FUNCTION get_following(
  target_user_id UUID,
  requesting_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username VARCHAR(30),
  display_name TEXT,
  avatar_url TEXT,
  verified_at TIMESTAMPTZ,
  verification_tier verification_tier,
  is_following BOOLEAN,
  is_mutual BOOLEAN,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.verified_at,
    u.verification_tier,
    is_following(requesting_user_id, u.id) as is_following,
    is_mutual_follow(requesting_user_id, u.id) as is_mutual,
    f.created_at as followed_at
  FROM follows f
  JOIN users u ON u.id = f.following_id
  WHERE f.follower_id = target_user_id
    AND u.deleted_at IS NULL
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Suggested users (based on mutual connections and location)
CREATE OR REPLACE FUNCTION get_suggested_users(
  for_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  username VARCHAR(30),
  display_name TEXT,
  avatar_url TEXT,
  verified_at TIMESTAMPTZ,
  verification_tier verification_tier,
  mutual_count INTEGER,
  reason TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH user_location AS (
    SELECT location_point FROM users WHERE id = for_user_id
  ),
  mutual_connections AS (
    SELECT 
      u.id,
      u.username,
      u.display_name,
      u.avatar_url,
      u.verified_at,
      u.verification_tier,
      COUNT(DISTINCT f2.follower_id) as mutual_count,
      'mutual_connections' as reason
    FROM users u
    JOIN follows f2 ON f2.following_id = u.id
    WHERE f2.follower_id IN (
      SELECT following_id FROM follows WHERE follower_id = for_user_id
    )
    AND u.id != for_user_id
    AND u.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM follows WHERE follower_id = for_user_id AND following_id = u.id
    )
    GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.verified_at, u.verification_tier
  ),
  nearby_users AS (
    SELECT 
      u.id,
      u.username,
      u.display_name,
      u.avatar_url,
      u.verified_at,
      u.verification_tier,
      0 as mutual_count,
      'nearby' as reason
    FROM users u, user_location ul
    WHERE u.id != for_user_id
    AND u.deleted_at IS NULL
    AND u.location_point IS NOT NULL
    AND ST_DWithin(
      u.location_point,
      ul.location_point,
      5000 -- 5km
    )
    AND NOT EXISTS (
      SELECT 1 FROM follows WHERE follower_id = for_user_id AND following_id = u.id
    )
    LIMIT 5
  )
  SELECT * FROM mutual_connections
  UNION ALL
  SELECT * FROM nearby_users
  ORDER BY mutual_count DESC, verified_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- Update notification type enum
ALTER TYPE notification_type ADD VALUE 'new_follower';
ALTER TYPE notification_type ADD VALUE 'follow_request_accepted';
